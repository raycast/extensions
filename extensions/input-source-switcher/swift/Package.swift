// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "InputSourceHelper",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "InputSourceHelper",
            path: "Sources/InputSourceHelper",
            linkerSettings: [
                .linkedFramework("Carbon"),
            ]
        ),
        .testTarget(
            name: "InputSourceHelperTests",
            path: "Tests/InputSourceHelperTests",
            linkerSettings: [
                .linkedFramework("Carbon"),
            ]
        ),
    ]
)
