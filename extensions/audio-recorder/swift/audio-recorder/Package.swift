// swift-tools-version: 5.10
import Foundation
import PackageDescription

let infoPlist = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent(
  "Info.plist"
).path
let package = Package(
  name: "audio-recorder",
  platforms: [.macOS("15.0")],
  products: [
    .executable(name: "audio-recorder", targets: ["audio-recorder"]),
    .library(name: "RecorderCore", targets: ["RecorderCore"]),
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", exact: "1.1.0")
  ],
  targets: [
    .executableTarget(
      name: "audio-recorder",
      dependencies: [
        "RecorderCore",
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ],
      path: "Sources/AudioRecorder",
      linkerSettings: [
        .unsafeFlags([
          "-Xlinker", "-sectcreate", "-Xlinker", "__TEXT", "-Xlinker", "__info_plist", "-Xlinker",
          infoPlist,
        ])
      ]
    ),
    .target(name: "RecorderCore"),
  ]
)
