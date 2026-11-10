// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "NativeBridge",
  platforms: [.macOS(.v13)],
  targets: [.executableTarget(name: "NativeBridge")]
)
