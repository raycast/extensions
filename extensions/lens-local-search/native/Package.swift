// swift-tools-version: 6.2
import PackageDescription

let vendor = "\(Context.packageDirectory)/Vendor"
let package = Package(
    name: "LensEngine",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "digup", targets: ["digup"])],
    targets: [
        .target(name: "DigUpKit"),
        .systemLibrary(name: "CLlama", path: "Sources/CLlama"),
        .target(name: "LlamaRuntime", dependencies: ["CLlama", "DigUpKit"],
                linkerSettings: [.unsafeFlags(["-L\(vendor)/llama/lib"])]),
        .executableTarget(name: "digup", dependencies: ["DigUpKit", "LlamaRuntime"]),
        .testTarget(name: "DigUpKitTests", dependencies: ["DigUpKit"], exclude: ["Pictures"]),
        .testTarget(name: "LlamaRuntimeTests", dependencies: ["LlamaRuntime"], exclude: ["Reference"]),
    ]
)
