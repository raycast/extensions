// swift-tools-version: 5.9
import PackageDescription

// Native Swift sidecar for the Clean Screen & Keyboard extension.
// Reached from TypeScript via the `swift:../swift` import scheme; the Raycast
// build plugins (run by `npm run dev` / ⌘B "Start Development") validate this
// target and generate the type-safe TS interface. See dev-docs.md §13.2.
//
// NOTE: there is intentionally no `main.swift`/`@main` — the RaycastSwiftPlugin
// injects the executable entry point. The exported surface is the global
// `@raycast` function in Sources/CleanScreenKeyboard/Exports.swift.
let package = Package(
  name: "CleanScreenKeyboard",
  platforms: [.macOS(.v12)],
  dependencies: [
    .package(url: "https://github.com/raycast/extensions-swift-tools", from: "1.0.5")
  ],
  targets: [
    .executableTarget(
      name: "CleanScreenKeyboard",
      dependencies: [
        .product(name: "RaycastSwiftMacros", package: "extensions-swift-tools"),
        .product(name: "RaycastSwiftPlugin", package: "extensions-swift-tools"),
        .product(name: "RaycastTypeScriptPlugin", package: "extensions-swift-tools"),
      ]
    )
  ]
)
