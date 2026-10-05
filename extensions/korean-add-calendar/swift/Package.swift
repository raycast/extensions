// swift-tools-version: 6.0

import PackageDescription

let package = Package(
  name: "KoreanCalendarBridge",
  platforms: [
    .macOS(.v13),
  ],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools.git", exact: "1.1.0"),
  ],
  targets: [
    .executableTarget(
      name: "KoreanCalendarBridge",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    ),
  ]
)
