// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "FileProviderProgress",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "FileProviderProgressCore",
            targets: ["FileProviderProgressCore"]
        ),
        .executable(
            name: "fp-progress",
            targets: ["fp-progress"]
        )
    ],
    targets: [
        .target(
            name: "FileProviderProgressCore"
        ),
        .executableTarget(
            name: "fp-progress",
            dependencies: ["FileProviderProgressCore"]
        ),
        .testTarget(
            name: "FileProviderProgressCoreTests",
            dependencies: ["FileProviderProgressCore"]
        )
    ]
)
