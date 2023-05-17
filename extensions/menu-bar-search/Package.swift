// swift-tools-version: 5.6

import PackageDescription

let package = Package(
  name: "menu-bar",
  platforms: [
    .macOS(.v10_15),
    
], 
dependencies: [
    .package(url: "https://github.com/apple/swift-protobuf.git", from: "1.6.0"),
],
targets: [
    .executableTarget(
      name: "menu-bar",
      dependencies: [.product(name: "SwiftProtobuf", package: "swift-protobuf")]
    ),
  ]

)