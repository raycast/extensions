import Foundation
import CoreBluetooth
import RaycastSwiftMacros

@raycast func getAranetData(uuidString: String) async throws -> AranetData {
  let manager = await AranetManager(targetIdentifier: uuidString)
  return try await manager.getData()
}

@raycast func scanForDevices() async throws -> [AranetDevice] {
  let manager = await AranetManager(targetIdentifier: "")
  return try await manager.scan()
}

struct AranetDevice: Encodable {
  let id: String
  let name: String
  let rssi: Int
}

struct AranetData: Encodable {
  let co2: Int
  let temperature: Double
  let humidity: Int
  let pressure: Double
  let battery: Int
  let deviceId: String
  let status: String
}

@MainActor
private class AranetManager: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate {
  private var centralManager: CBCentralManager!
  private var peripheral: CBPeripheral?
  private var continuation: CheckedContinuation<AranetData, Error>?
  private var scanContinuation: CheckedContinuation<[AranetDevice], Error>?
  private var discoveredDevices: [AranetDevice] = []
  private let targetIdentifier: String



  
  private let aranetServiceUUID = CBUUID(string: "FCE0")
  private let aranetCharacteristicUUID = CBUUID(string: "F0CD1503-95DA-4F4B-9AC8-AA55D312AF0C")
  
  init(targetIdentifier: String) {
    self.targetIdentifier = targetIdentifier
    self.centralManager = CBCentralManager(delegate: nil, queue: nil)
    super.init()
    self.centralManager.delegate = self
  }
  
  func getData() async throws -> AranetData {
    return try await withCheckedThrowingContinuation { continuation in
      self.continuation = continuation
      DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
        if self.continuation != nil {
          self.fail(with: "Timeout (30s) - Device didn't respond in time")
          self.centralManager.stopScan()
        }
      }
    }
  }

  func scan() async throws -> [AranetDevice] {
    return try await withCheckedThrowingContinuation { continuation in
      self.scanContinuation = continuation
      DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
        self.centralManager.stopScan()
        self.finishScan()
      }
    }
  }
    
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    switch central.state {
    case .poweredOn:
      if scanContinuation != nil {
         centralManager.scanForPeripherals(
           withServices: [aranetServiceUUID],
           options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
         )
      } else {
         scanOrConnect()
      }
    default:
      fail(with: "Bluetooth is not powered on")
    }
  }
  
  private func scanOrConnect() {
    if let uuid = UUID(uuidString: targetIdentifier),
       let peripheral = centralManager.retrievePeripherals(withIdentifiers: [uuid]).first {
      self.peripheral = peripheral
      connect(to: peripheral)
    } else {
      centralManager.scanForPeripherals(withServices: [aranetServiceUUID], options: nil)
    }
  }
  
  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
    if scanContinuation != nil {
      let device = AranetDevice(
        id: peripheral.identifier.uuidString,
        name: peripheral.name ?? "Aranet4",
        rssi: RSSI.intValue
      )
      if !discoveredDevices.contains(where: { $0.id == device.id }) {
         discoveredDevices.append(device)
      }
      return
    }

    
    if !targetIdentifier.isEmpty {
         guard peripheral.identifier.uuidString == targetIdentifier else {
             return
         }
    }
    
    self.peripheral = peripheral
    centralManager.stopScan()
    connect(to: peripheral)
  }
  
  private func connect(to peripheral: CBPeripheral) {
    peripheral.delegate = self
    centralManager.connect(peripheral, options: nil)
  }
  
  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    peripheral.discoverServices([aranetServiceUUID])
  }
  
  func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
    fail(with: error?.localizedDescription ?? "Failed to connect")
  }
    
  nonisolated func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    if let error = error {
      Task { await fail(with: error.localizedDescription) }
      return
    }
    
    Task {
      
      guard let service = peripheral.services?.first(where: { $0.uuid == aranetServiceUUID }) else {
        await fail(with: "Aranet service not found. Found: \(String(describing: peripheral.services?.map { $0.uuid }))")
        return
      }
      
      peripheral.discoverCharacteristics(nil, for: service)
    }
  }
  
  nonisolated func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    if let error = error {
      Task { await fail(with: error.localizedDescription) }
      return
    }
    
    Task {
      
      guard let characteristic = service.characteristics?.first(where: { $0.uuid == aranetCharacteristicUUID }) else {
        await fail(with: "Aranet characteristic not found")
        return
      }
      
      peripheral.readValue(for: characteristic)
    }
  }
  
  nonisolated func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
    if let error = error {
      Task { await fail(with: error.localizedDescription) }
      return
    }
    
    Task {
      guard let data = characteristic.value else {
        await fail(with: "No data received")
        return
      }
      
      do {
        let aranetData = try await parse(data: data)
        await succeed(with: aranetData)
      } catch {
        await fail(with: error.localizedDescription)
      }
      
      await centralManager.cancelPeripheralConnection(peripheral)
    }
  }
    
    
    
  private func parse(data: Data) throws -> AranetData {
    guard data.count >= 9 else {
      throw NSError(domain: "Aranet", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid data length"])
    }
    
    let co2 = data.withUnsafeBytes { $0.load(fromByteOffset: 0, as: UInt16.self) }
    let tempRaw = data.withUnsafeBytes { $0.load(fromByteOffset: 2, as: UInt16.self) }
    let pressureRaw = data.withUnsafeBytes { $0.load(fromByteOffset: 4, as: UInt16.self) }
    let humidity = data[6]
    let battery = data[7]
    let statusByte = data[8]
    
    let temperature = Double(tempRaw) / 20.0
    let pressure = Double(pressureRaw) / 10.0
    
    let status: String
    switch statusByte {
    case 1: status = "🟢"
    case 2: status = "🟡"
    case 3, 4: status = "🔴" // 4 might be error?
    default: status = "⚪️"
    }
    
    return AranetData(
      co2: Int(co2),
      temperature: temperature,
      humidity: Int(humidity),
      pressure: pressure,
      battery: Int(battery),
      deviceId: self.peripheral?.identifier.uuidString ?? "",
      status: status
    )
  }
  
  private func fail(with message: String) {
    if let continuation = continuation {
      continuation.resume(throwing: NSError(domain: "Aranet", code: 0, userInfo: [NSLocalizedDescriptionKey: message]))
      self.continuation = nil
    }
  }
  
  private func succeed(with data: AranetData) {
    if let continuation = continuation {
      continuation.resume(returning: data)
      self.continuation = nil
    }
  }

  private func finishScan() {
    if let continuation = scanContinuation {
      continuation.resume(returning: discoveredDevices)
      self.scanContinuation = nil
    }
  }
}
