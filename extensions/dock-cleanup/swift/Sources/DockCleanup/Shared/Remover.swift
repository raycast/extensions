// Shared with the Dock Cleanup menu bar app: https://github.com/alaramartin/dock-cleanup/blob/main/Sources/DockCleanup/Shared/Remover.swift

import AppKit

/// Quits the selected apps and takes their icons out of the Dock.
enum Remover {
    static func run(_ apps: [AppRef]) async {
        // Quit everything at once, then remove icons one by one as each app finishes quitting.
        await withTaskGroup(of: AppRef?.self) { group in
            for app in apps {
                group.addTask { await quit(app) ? app : nil }
            }
            var failed: [AppRef] = []
            for await app in group {
                guard let app else { continue }
                // Let the Dock settle (a just-quit app can take a moment to move into Recents).
                try? await Task.sleep(for: .milliseconds(400))
                let ok = await MainActor.run { () -> Bool in
                    guard Dock.appItems().contains(where: { $0.ref.matches(app) }) else { return true }
                    return Dock.removeViaMenu(app)
                }
                if !ok { failed.append(app) }
            }
            if !failed.isEmpty {
                let leftover = failed
                await MainActor.run { Dock.removeViaPreferences(leftover) }
            }
        }
    }

    /// Asks every running copy of the app to quit and waits for them to exit.
    /// Returns false if the app is still running after two minutes (e.g. its save dialog was cancelled).
    private static func quit(_ app: AppRef) async -> Bool {
        let running = await MainActor.run { NSWorkspace.shared.runningApplications.filter { app.matches($0) } }
        guard !running.isEmpty else { return true }
        for r in running { r.terminate() }
        let deadline = Date().addingTimeInterval(120)
        while Date() < deadline {
            if running.allSatisfy(\.isTerminated) { return true }
            try? await Task.sleep(for: .milliseconds(200))
        }
        return false
    }
}
