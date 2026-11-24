// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "DockCleanup",
  platforms: [.macOS(.v14)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0")
  ],
  targets: [
    .executableTarget(
      name: "DockCleanup",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    )
  ],
  // The shared sweep code is written for the Swift 5 language mode, like the menu bar app.
  swiftLanguageModes: [.v5]
)
