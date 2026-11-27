// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "SnapAndGrab",
    platforms: [.macOS(.v12)],
    dependencies: [.package(url: "https://github.com/raycast/extensions-swift-tools.git", exact: "1.1.0")],
    targets: [.executableTarget(name: "SnapAndGrab", dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools")
    ])]
)
