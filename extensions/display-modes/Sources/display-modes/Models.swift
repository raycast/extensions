import Foundation

struct Display: Equatable, Codable, Identifiable {
    enum Kind: String, Equatable, Codable {
        case builtIn, external
    }
    
    let id: Int
    let kind: Kind
}

struct Mode: Equatable, Codable {
    let width: Int
    let height: Int
    let refreshRate: Int
    let horizontalResolution: Int?
    let verticalResolution: Int?
    let pixelsWide: Int?
    let pixelsHigh: Int?
    let depthFormat: Int?
    let unavailable: Bool?
    let isSuitableForUI: Bool?
    let isSafeForHardware: Bool?
    let isStretched: Bool?
    let scale: Int?
    let mode: Int?
    let id: Int?
    
    var pixels: Int {
        (pixelsWide ?? 0) * (pixelsHigh ?? 0)
    }
}

struct DisplayInfo: Equatable, Codable {
    let display: Display
    let currentMode: Mode
    let modes: [Mode]
}
