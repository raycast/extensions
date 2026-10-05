// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "FastNavBridge",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(
            url: "https://github.com/raycast/extensions-swift-tools.git",
            from: "1.1.0"
        )
    ],
    targets: [
        .executableTarget(
            name: "FastNavBridge",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools")
            ]
        )
    ]
)
