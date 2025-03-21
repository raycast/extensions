// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "QuitAllButFocused",
    platforms: [.macOS(.v12)],
    dependencies: [.package(url:"https://github.com/raycast/extensions-swift-tools", from: "1.0.0")],
    targets: [
        // Targets are the basic building blocks of a package, defining a module or a test suite.
        // Targets can depend on other targets in this package and products from dependencies.
        .executableTarget(
            name: "QuitAllButFocused",
            dependencies: [
                .product(name: "RaycastSwiftMacros", package:"extensions-swift-tools"),
                .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
                .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
                ]            
        ),
    ]
)

