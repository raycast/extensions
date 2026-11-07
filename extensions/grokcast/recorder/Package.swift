// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "GrokcastRecorder",
  platforms: [.macOS(.v13)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools.git", from: "1.1.0"),
  ],
  targets: [
    .executableTarget(
      name: "GrokcastRecorder",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ],
      // AVAudioEngine's tap callback is not Sendable-annotated, so use the Swift 5 checks.
      swiftSettings: [.swiftLanguageMode(.v5)]
    ),
  ]
)
