// swift-tools-version: 5.10
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "svga-player",
    platforms: [
      .macOS(.v12)
    ],
    dependencies: [
      .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.4")
    ],
    targets: [
        .executableTarget(
            name: "svga-player",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ],
            path: "Sources"
        ),
    ]
)
