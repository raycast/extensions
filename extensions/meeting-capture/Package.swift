// swift-tools-version: 6.4
import PackageDescription

let package = Package(
    name: "MeetingCaptureHelper",
    platforms: [.macOS(.v27)],
    products: [.executable(name: "MeetingCaptureHelper", targets: ["MeetingCaptureHelper"])],
    targets: [
        .executableTarget(name: "MeetingCaptureHelper"),
        .testTarget(name: "MeetingCaptureHelperTests", dependencies: ["MeetingCaptureHelper"]),
    ]
)
