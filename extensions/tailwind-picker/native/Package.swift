// swift-tools-version: 5.6

import PackageDescription

let package = Package(
  name: "tailwind-picker",
  platforms: [
    .macOS(.v10_15),
  ],
  targets: [
    .executableTarget(
      name: "tailwind-picker",
      dependencies: [],
      path: "src"
    ),
  ]
)