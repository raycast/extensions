import Foundation
import HDRCore
import RaycastSwiftMacros

struct Display: Codable {
  let id: Int32
  let name: String
  let uuid: String
  let builtin: Bool
  let hdrCapable: Bool
  let hdr: Bool
}

enum HdrError: Error {
  case readFailed
  case invalidValue
  case setFailed
}

@raycast func listDisplays() throws -> [Display] {
  guard let raw = hdr_list_json() else { throw HdrError.readFailed }
  defer { hdr_free(raw) }

  let json = String(cString: raw)
  return try JSONDecoder().decode([Display].self, from: Data(json.utf8))
}

@raycast func setHdr(displayID: Int32, value: String) throws -> Bool {
  let mode: Int32
  switch value {
  case "on": mode = 1
  case "off": mode = 0
  case "toggle": mode = 2
  default: throw HdrError.invalidValue
  }

  let result = hdr_set(displayID, mode)
  guard result >= 0 else { throw HdrError.setFailed }
  return result == 1
}
