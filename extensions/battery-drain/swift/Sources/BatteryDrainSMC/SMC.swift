import Foundation
import IOKit
import RaycastSwiftMacros

// Reads power keys from the System Management Controller, the chip that meters the Mac's power rails.
// Unlike ioreg's battery telemetry, which macOS refreshes about once a minute, SMC values are live.
// Opening AppleSMC for reading needs no administrator rights. Keys are undocumented and vary by model,
// so this only decodes what it finds; the TypeScript side decides which readings are plausible.

private typealias Bytes32 = (
  UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8,
  UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8, UInt8
)

// The layout AppleSMC's user client expects (SMCParamStruct); field order and sizes must not change.
private struct SMCVersion { var major: UInt8 = 0, minor: UInt8 = 0, build: UInt8 = 0, reserved: UInt8 = 0; var release: UInt16 = 0 }
private struct SMCPLimit { var version: UInt16 = 0, length: UInt16 = 0; var cpu: UInt32 = 0, gpu: UInt32 = 0, mem: UInt32 = 0 }
private struct SMCKeyInfo { var dataSize: UInt32 = 0, dataType: UInt32 = 0; var dataAttributes: UInt8 = 0 }
private struct SMCParam {
  var key: UInt32 = 0
  var vers = SMCVersion()
  var pLimitData = SMCPLimit()
  var keyInfo = SMCKeyInfo()
  var padding: UInt16 = 0
  var result: UInt8 = 0
  var status: UInt8 = 0
  var data8: UInt8 = 0
  var data32: UInt32 = 0
  var bytes: Bytes32 = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
}

private let handleYPCEvent: UInt32 = 2
private let readBytes: UInt8 = 5
private let readKeyInfo: UInt8 = 9

private func fourCC(_ s: String) -> UInt32? {
  let chars = Array(s.utf8)
  return chars.count == 4 ? chars.reduce(0) { ($0 << 8) | UInt32($1) } : nil
}

private func typeName(_ v: UInt32) -> String {
  String(bytes: [24, 16, 8, 0].map { UInt8((v >> $0) & 0xff) }, encoding: .ascii) ?? ""
}

private func call(_ conn: io_connect_t, _ input: inout SMCParam) -> SMCParam? {
  var output = SMCParam()
  var size = MemoryLayout<SMCParam>.stride
  let r = IOConnectCallStructMethod(conn, handleYPCEvent, &input, MemoryLayout<SMCParam>.stride, &output, &size)
  return r == kIOReturnSuccess && output.result == 0 ? output : nil
}

/// Apple Silicon stores power as little-endian floats ("flt "); Intel as big-endian fixed point ("sp78").
private func decode(_ type: String, _ b: [UInt8]) -> Double? {
  let be16 = b.count >= 2 ? UInt16(b[0]) << 8 | UInt16(b[1]) : 0
  switch type {
  case "flt ": return b.count >= 4 ? Double(b.withUnsafeBytes { $0.loadUnaligned(as: Float32.self) }) : nil
  case "sp78": return b.count >= 2 ? Double(Int16(bitPattern: be16)) / 256 : nil
  case "sp87": return b.count >= 2 ? Double(Int16(bitPattern: be16)) / 128 : nil
  case "sp96": return b.count >= 2 ? Double(Int16(bitPattern: be16)) / 64 : nil
  case "fpe2": return b.count >= 2 ? Double(be16) / 4 : nil
  default: return nil
  }
}

private func read(_ conn: io_connect_t, _ key: UInt32) -> Double? {
  var info = SMCParam()
  info.key = key
  info.data8 = readKeyInfo
  guard let found = call(conn, &info), found.keyInfo.dataSize <= 32 else { return nil }
  var request = SMCParam()
  request.key = key
  request.keyInfo.dataSize = found.keyInfo.dataSize
  request.data8 = readBytes
  guard let out = call(conn, &request) else { return nil }
  let bytes = withUnsafeBytes(of: out.bytes) { Array($0.prefix(Int(found.keyInfo.dataSize))) }
  guard let value = decode(typeName(found.keyInfo.dataType), bytes), value.isFinite else { return nil }
  return value
}

/// Reads the given four-character SMC keys, in watts for power keys. Keys this Mac lacks are left out;
/// an empty result means SMC could not be opened.
@raycast func readSMC(keys: [String]) -> [String: Double] {
  let service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("AppleSMC"))
  guard service != 0 else { return [:] }
  defer { IOObjectRelease(service) }
  var conn: io_connect_t = 0
  guard IOServiceOpen(service, mach_task_self_, 0, &conn) == kIOReturnSuccess else { return [:] }
  defer { IOServiceClose(conn) }

  var values: [String: Double] = [:]
  for name in keys {
    if let key = fourCC(name), let value = read(conn, key) { values[name] = value }
  }
  return values
}
