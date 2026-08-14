// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "CameraPreview",
    platforms: [
      .macOS(.v13)
    ],
    dependencies: [
      .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.1.0")
    ],
    targets: [
      .executableTarget(
        name: "CameraPreview",
        dependencies: [
          .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
          .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
          .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
        ]
      ),
    ]
)
