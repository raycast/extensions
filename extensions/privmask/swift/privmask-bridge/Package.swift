// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "privmask-bridge",
  platforms: [
    .macOS(.v13)
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.4"),
    .package(url: "https://github.com/snaka/privmask", from: "0.3.1"),
  ],
  targets: [
    .executableTarget(
      name: "privmask-bridge",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
        .product(name: "PrivMask", package: "privmask"),
      ]
    )
  ]
)
