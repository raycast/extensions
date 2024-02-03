// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
  name: "color-picker",
  platforms: [
    .macOS(.v12),
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/raycast-extension-macro", from: "0.1.0")
  ],
  targets: [
    .executableTarget(
      name: "color-picker",
      dependencies: [
        .product(name: "RaycastExtensionMacro", package: "raycast-extension-macro"),
      ]
    ),
  ]
)
