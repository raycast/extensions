// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "CutOutHelper",
  platforms: [.macOS(.v12)],
  products: [
    .executable(name: "CutOutHelper", targets: ["CutOutHelper"]),
  ],
  targets: [
    .executableTarget(name: "CutOutHelper"),
  ]
)
