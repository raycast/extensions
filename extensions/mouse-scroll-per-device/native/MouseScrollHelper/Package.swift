// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MouseScrollHelper",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "mouse-scroll-helper", targets: ["MouseScrollHelper"])],
    targets: [
        .executableTarget(name: "MouseScrollHelper"),
        .testTarget(name: "MouseScrollHelperTests", dependencies: ["MouseScrollHelper"]),
    ]
)
