// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "Messages",
  platforms: [
    .macOS(.v12)
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.5"),
    .package(url: "https://github.com/stephencelis/SQLite.swift.git", from: "0.12.2"),
  ],
  targets: [
    .executableTarget(
      name: "Messages",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
        .product(name: "SQLite", package: "SQLite.swift"),
      ]
    )
  ]
)
