// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FocusStageSwift",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/raycast/extensions-swift-tools.git", from: "1.1.0"),
    ],
    targets: [
        // Window, backdrop and session logic, shared with a standalone version of Focus Stage.
        .target(
            name: "FocusStageCore",
            path: "Sources/FocusStageCore"
        ),
        .executableTarget(
            name: "FocusStageSwift",
            dependencies: [
                "FocusStageCore",
                .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
            ],
            path: "Sources/FocusStageSwift"
        ),
    ]
)
