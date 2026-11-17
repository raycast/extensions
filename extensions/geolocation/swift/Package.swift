// swift-tools-version: 6.0

import PackageDescription

// Built by Raycast's Swift bridge into assets/compiled_raycast_swift/GeoLocation.
let package = Package(
  name: "GeoLocation",
  platforms: [.macOS(.v15)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0")
  ],
  targets: [
    .executableTarget(
      name: "GeoLocation",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ],
      path: "Sources"
    )
  ]
)
