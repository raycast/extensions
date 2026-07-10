// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "Messages",
  platforms: [
    .macOS(.v12)
  ],
  products: [
    .executable(name: "Messages", targets: ["Messages"]),
    .library(name: "ContactMatching", targets: ["ContactMatching"]),
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.5"),
  ],
  targets: [
    .target(
      name: "ContactMatching",
      dependencies: []
    ),
    .executableTarget(
      name: "Messages",
      dependencies: [
        "ContactMatching",
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    ),
  ]
)
