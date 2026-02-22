// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "QRCodeScanner",
  platforms: [
    .macOS(.v10_15),
  ],
  products: [
    .executable(name: "QRCodeScanner", targets: ["QRCodeScanner"]),
  ],
  targets: [
    .executableTarget(name: "QRCodeScanner"),
  ]
)
