// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "Location",
  platforms: [
    .macOS(.v12)
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.0")
  ],
  targets: [
    .executableTarget(
      name: "Location",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    )
  ]
)
