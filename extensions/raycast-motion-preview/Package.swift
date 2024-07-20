// swift-tools-version: 5.10
import PackageDescription

let package = Package(
  name: "RcMotionPreview",
  platforms: [
    .macOS(.v12),
  ],
  targets: [
    .executableTarget(
      name: "rc-motion-preview",
      dependencies: [],
      path: "swift"
    ),
  ]
)
