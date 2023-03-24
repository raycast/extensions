// swift-tools-version: 5.6
import PackageDescription

let package = Package(
  name: "ocr",
  platforms: [
    .macOS(.v10_15),
],
  targets: [
    .executableTarget(
      name: "ocr",
      dependencies: []
    ),
  ]
)
