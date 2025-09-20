import Foundation
import ArgumentParser

let displayManager: DisplayManager = CGDisplayManager()

struct DisplayModes: ParsableCommand {
    static var configuration = CommandConfiguration(
        abstract: "A utility for listing and setting display modes",
        subcommands: [ListDisplays.self, SetMode.self],
        defaultSubcommand: ListDisplays.self
    )
}

struct SetMode: ParsableCommand {
    @Argument var display: Int
    @Option(name: .shortAndLong) var width: Int?
    @Option(name: .shortAndLong) var height: Int?
    @Option(name: .shortAndLong) var scale: Int?
    @Option(name: .shortAndLong) var refreshRate: Int?
    @Flag(help: "Output only JSON")
    var json = false
    
    mutating func run() throws {
        let result = displayManager.setBestMode(
            for: display,
            width: width,
            height: height,
            refreshRate: refreshRate,
            scale: scale
        )
        
        if json {
            let encoder = JSONEncoder()
            let encoded = try encoder.encode(result)
            let string = String(data: encoded, encoding: .utf8) ?? ""
            print(string)
        } else {
            print(
                result
                    ? "Mode successfully set"
                    : "Failed to set mode"
            )
        }
    }
}

struct ListDisplays: ParsableCommand {
    @Flag(help: "Output only JSON")
    var json = false
    
    mutating func run() throws {
        let displaysInfo = listDisplays()
        
        if json {
            let encoder = JSONEncoder()
            let encoded = try encoder.encode(displaysInfo)
            let string = String(data: encoded, encoding: .utf8) ?? ""
            print(string)
        } else {
            print(formatAsPlayString(displaysInfo))
        }
    }
    
    private func listDisplays() -> [DisplayInfo] {
        displayManager.listDisplays()?
            .compactMap {
                guard let currentMode = displayManager.currentMode(for: $0.id),
                      let modes = displayManager.listBestModes(for: $0.id)
                else { return nil }
                
                return DisplayInfo(display: $0, currentMode: currentMode, modes: modes)
            } ?? []
    }
    
    private func formatAsPlayString(_ displaysInfo: [DisplayInfo]) -> String {
        var result = ""
        for displayInfo in displaysInfo {
            result.append("Display \(displayInfo.display.id) (\(formatAsPlayString(displayInfo.display.kind)) display)\n")
            result.append("Width x Height @ Scale Refresh Depth\n")
            for mode in displayInfo.modes {
                result.append(
                    String(
                        format: "%5d x %5d  @ %2dx %6dHz %3d",
                        mode.width,
                        mode.height,
                        mode.scale ?? 0,
                        mode.refreshRate,
                        mode.depthFormat ?? 0
                    )
                )
                
                if mode == displayInfo.currentMode {
                    result.append(" (current mode)\n")
                } else {
                    result.append("\n")
                }
            }
            result.append("\n")
        }
        return result
    }
    
    private func formatAsPlayString(_ kind: Display.Kind) -> String {
        switch kind {
        case .builtIn:
            return "Built-in"
        case .external:
            return "External"
        }
    }
}

DisplayModes.main()
