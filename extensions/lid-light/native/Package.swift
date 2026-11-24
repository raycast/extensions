// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LidLight",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "LidLightHelper", targets: ["LidLightHelper"])],
    targets: [
        .target(name: "LogoLightCore", linkerSettings: [.linkedFramework("IOKit")]),
        .executableTarget(name: "LidLightHelper", dependencies: ["LogoLightCore"])
    ]
)
