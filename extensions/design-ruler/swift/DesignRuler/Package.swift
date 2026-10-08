// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "DesignRuler",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "DesignRulerCore", targets: ["DesignRulerCore"]),
    ],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.4"),
    ],
    targets: [
        .target(
            name: "DesignRulerCore",
            path: "Sources/DesignRulerCore"
        ),
        .executableTarget(
            name: "DesignRuler",
            dependencies: [
                "DesignRulerCore",
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ],
            path: "Sources/RaycastBridge"
        ),
    ]
)
