import Foundation
import CoreGraphics

/// Concrete implementation of DisplayManager that uses CoreGraphics
struct CGDisplayManager: DisplayManager {
    func listDisplays() -> [Display]? {
        listOnlineDisplayIDs()
            .map {
                $0.map(Display.init)
            }
    }

    func currentMode(for displayID: Int) -> Mode? {
        CGDisplayCopyDisplayMode(CGDirectDisplayID(displayID)).map(Mode.init)
    }

    func listBestModes(for displayID: Int) -> [Mode]? {
        listGoodCGModes(for: CGDirectDisplayID(displayID))?
            .map(Mode.init)
    }

    func setBestMode(
        for displayID: Int,
        width: Int?,
        height: Int?,
        refreshRate: Int?,
        scale: Int?
    ) -> Bool {
        let display = CGDirectDisplayID(displayID)
        guard let goodCGModes = listGoodCGModes(for: display)
        else { return false }
        
        guard let selectedCGMode = goodCGModes.first(where: { mode in
            let widthMatches = (width.map { mode.width == $0 } ?? true)
            let heightMatches = (height.map { mode.height == $0 } ?? true)
            let refreshRateMatches = (refreshRate.map { Int(mode.refreshRate) == $0 } ?? true)
            
            if widthMatches && heightMatches && refreshRateMatches {
                if let scale {
                    return mode.parseProperties()[.scale] == scale
                } else {
                    return true
                }
            } else {
                return false
            }
        }) else { return false }
        
        return set(mode: selectedCGMode, for: display)
    }
}

private extension CGDisplayManager {
    func currentCGMode(for displayID: Int) -> CGDisplayMode? {
        CGDisplayCopyDisplayMode(CGDirectDisplayID(displayID))
    }

    func listOnlineDisplayIDs() -> [CGDirectDisplayID]? {
        var displayCount: UInt32 = 0
        let err = CGGetOnlineDisplayList(0, nil, &displayCount)

        guard err == .success else {
            return nil
        }

        var onlineDisplays = [CGDirectDisplayID](repeating: 0, count: Int(displayCount))
        CGGetOnlineDisplayList(displayCount, &onlineDisplays, &displayCount)

        return onlineDisplays
    }

    func listCGModes(for displayID: CGDirectDisplayID) -> [CGDisplayMode]? {
        let option = [kCGDisplayShowDuplicateLowResolutionModes: kCFBooleanTrue] as CFDictionary?
        return CGDisplayCopyAllDisplayModes(displayID, option) as? [CGDisplayMode]
    }

    func listGoodCGModes(for displayID: CGDirectDisplayID) -> [CGDisplayMode]? {
        listCGModes(for: displayID)?
            .filter(\.isGoodMode)
            .filterBestModes()
    }
    
    func set(mode: CGDisplayMode, for displayID: CGDirectDisplayID) -> Bool {
        let currentCGMode = currentCGMode(for: Int(displayID))
        
        guard mode !== currentCGMode else {
            // Mode already set
            return false
        }

        var config: CGDisplayConfigRef?

        let error: CGError = CGBeginDisplayConfiguration(&config)
        guard error == .success else {
            return false
        }
        CGConfigureDisplayWithDisplayMode(config, displayID, mode, nil)

        let afterCheck = CGCompleteDisplayConfiguration(config, CGConfigureOption.permanently)
        
        guard afterCheck == .success else {
            CGCancelDisplayConfiguration(config)
            return false
        }
        
        return true
    }
}

private extension Display {
    init(_ display: CGDirectDisplayID) {
        self.init(
            id: Int(display),
            kind: CGDisplayIsBuiltin(display) == 1 ? .builtIn : .external
        )
    }
}

private extension CGDisplayMode {
    var isGoodMode: Bool {
        let props = parseProperties()

        return props[.isSuitableForUI]?.asBool == true
            && props[.isSafeForHardware]?.asBool == true
            && props[.isStretched]?.asBool == false
    }

    var pixels: Int {
        pixelWidth * pixelHeight
    }
}

private extension Int {
    var asBool: Bool {
        self == 1
    }
}

private extension Mode {
    init(_ mode: CGDisplayMode) {
        let props = mode.parseProperties()

        self.init(
            width: mode.width,
            height: mode.height,
            refreshRate: Int(mode.refreshRate),
            horizontalResolution: props[.horizontalResolution],
            verticalResolution: props[.verticalResolution],
            pixelsWide: props[.pixelsWide],
            pixelsHigh: props[.pixelsHigh],
            depthFormat: props[.depthFormat],
            unavailable: props[.unavailable].map { $0 == 1 },
            isSuitableForUI: props[.isSuitableForUI].map { $0 == 1 },
            isSafeForHardware: props[.isSafeForHardware].map { $0 == 1 },
            isStretched: props[.isStretched].map { $0 == 1 },
            scale: props[.scale],
            mode: props[.mode],
            id: props[.id]
        )
    }
}

private extension Array where Element == CGDisplayMode {
    /// Filter modes to keep only the best ones
    func filterBestModes() -> [CGDisplayMode] {
        var dict: [String: [CGDisplayMode]] = [:]

        for mode in self {
            let props = mode.parseProperties()

            // We need to group modes by resolution and scale
            // so we only pick the mode with highest refresh rate
            let key = "\(mode.width)x\(mode.height)" + (props[.scale].map { "x\($0)" } ?? "")

            var list = dict[key] ?? []
            list.append(mode)

            dict[key] = list.sorted(by: {
                $0.refreshRate > $1.refreshRate
            })
        }

        return dict.values
            .compactMap(\.first)
            .sorted {
                $0.isBetter(than: $1)
            }
    }
}

private extension Dictionary where Key == String, Value == Int {
    subscript(_ key: CGDisplayMode.ParsedProperty) -> Int? {
        self[key.rawValue]
    }
}

private extension CGDisplayMode {
    enum ParsedProperty: String {
        case horizontalResolution = "kCGDisplayHorizontalResolution"
        case verticalResolution = "kCGDisplayVerticalResolution"
        case depthFormat = "DepthFormat"
        case unavailable = "kCGDisplayModeIsUnavailable"
        case isSuitableForUI = "kCGDisplayModeSuitableForUI"
        case isSafeForHardware = "kCGDisplayModeIsSafeForHardware"
        case isStretched = "kCGDisplayModeIsStretched"
        case scale = "kCGDisplayResolution"
        case mode = "Mode"
        case id = "IODisplayModeID"
        case pixelsHigh = "kCGDisplayPixelsHigh"
        case pixelsWide = "kCGDisplayPixelsWide"
    }
    
    
    /// Check if a mode is better than other by selecting the one with more pixels.
    /// If both have the samer of  pixels then we get the one with highest refresh rate
    func isBetter(than mode: CGDisplayMode) -> Bool {
        let props0 = self.parseProperties()
        let props1 = mode.parseProperties()
        
        if let scale0 = props0[.scale], let scale1 = props1[.scale] {
            guard scale0 == scale1 else {
                return scale0 > scale1
            }
        }
        
        let pixels0 = self.pixels
        let pixels1 = mode.pixels

        if pixels0 > pixels1 {
            return true
        } else if pixels0 == pixels1 {
            return self.refreshRate > mode.refreshRate
        } else {
            return false
        }
    }

    /**
     Parses the properties of the object using reflection to extract key-value pairs where the value is an integer.
     This is very hacky.
     Unfortunately, there is no proper way to get many interesting properties from `CGDisplayMode`
     so the only way is to parse the internal properties using reflection
     
     - Returns: A dictionary where the key is a string representing the property name and the value is its integer value.
     */
    func parseProperties() -> [String: Int] {
        let string = String(reflecting: self)

        var result: [String: Int] = [:]

        // Regular expression to match key-value pairs where value is an integer
        let pattern = "([a-zA-Z0-9_]+)\\s*=\\s*(\\d+);"

        let regex: NSRegularExpression
        do {
            regex = try NSRegularExpression(pattern: pattern, options: [])
        } catch {
            print("Invalid regex pattern")
            return result
        }

        let matches = regex.matches(
            in: string,
            options: [],
            range: NSRange(location: 0, length: string.utf16.count)
        )

        for match in matches {
            let keyRange = match.range(at: 1)
            let valueRange = match.range(at: 2)

            if let key = Range(keyRange, in: string),
                let value = Range(valueRange, in: string)
            {

                let keyString = String(string[key])
                let valueInt = Int(string[value])

                if let valueInt = valueInt {
                    result[keyString] = valueInt
                }
            }
        }

        return result
    }
}
