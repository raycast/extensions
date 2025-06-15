// swift-tools-version: 5.6
import PackageDescription

let package = Package(
  name: "media-key",
  platforms: [
    .macOS(.v10_15),
],
  targets: [
    .executableTarget(
      name: "media-key",
      dependencies: []
    ),
  ]
)
