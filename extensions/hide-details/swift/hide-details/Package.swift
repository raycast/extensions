// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "hide-details",
  platforms: [.macOS(.v14)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.4")
  ],
  targets: [
    .executableTarget(
      name: "hide-details",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    )
  ]
)
