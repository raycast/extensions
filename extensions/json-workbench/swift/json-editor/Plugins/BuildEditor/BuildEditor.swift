import Foundation
import PackagePlugin

@main
struct BuildEditor: BuildToolPlugin {
    func createBuildCommands(context: PluginContext, target: Target) async throws -> [Command] {
        let root = context.package.directoryURL.deletingLastPathComponent().deletingLastPathComponent()
        let script = context.package.directoryURL.appendingPathComponent("BuildEditor.mjs")
        let output = context.pluginWorkDirectoryURL.appendingPathComponent("EmbeddedEditor.swift")
        let sources = ["editor", "src/lib"].flatMap { directory -> [URL] in
            let url = root.appendingPathComponent(directory)
            return (FileManager.default.enumerator(at: url, includingPropertiesForKeys: nil)?.allObjects as? [URL] ?? [])
                .filter { ["ts", "css", "html"].contains($0.pathExtension) }
        }
        return [.buildCommand(
            displayName: "Bundle local web editor from source",
            executable: URL(fileURLWithPath: "/usr/bin/env"),
            arguments: ["node", script.path, root.path, output.path],
            inputFiles: sources + [script, root.appendingPathComponent("package-lock.json")],
            outputFiles: [output]
        )]
    }
}
