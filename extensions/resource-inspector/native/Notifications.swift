import Foundation
import AppKit
import UserNotifications
import CoreServices

// This bundle lives beside history.sqlite in Raycast's private support folder.
// macOS relaunches it to handle a button; no long-running notification listener.
final class NotificationDelegate: NSObject, NSApplicationDelegate, UNUserNotificationCenterDelegate {
    let center = UNUserNotificationCenter.current()
    let path = Bundle.main.bundleURL.deletingLastPathComponent().appendingPathComponent("history.sqlite").path
    var finishing = false
    func finish(_ value: [String: Any]) {
        guard !finishing else { return }
        finishing = true
        try? emit(value)
        NSApplication.shared.terminate(nil)
    }
    func applicationWillFinishLaunching(_ notification: Notification) {
        center.delegate = self
        let force = UNNotificationAction(identifier: "force-quit", title: "Force Quit", options: [.destructive, .authenticationRequired])
        center.setNotificationCategories([UNNotificationCategory(identifier: "inactive-target", actions: [force], intentIdentifiers: [], options: [.customDismissAction])])
    }
    func applicationDidFinishLaunching(_ notification: Notification) {
        let operation = CommandLine.arguments.dropFirst().first ?? "callback"
        switch operation {
        case "permission":
            center.requestAuthorization(options: [.alert]) { granted, error in
                DispatchQueue.main.async { self.finish(["authorized": granted, "error": error?.localizedDescription as Any? ?? NSNull()]) }
            }
        case "status":
            center.getNotificationSettings { settings in
                DispatchQueue.main.async { self.finish(["authorized": settings.authorizationStatus == .authorized, "status": settings.authorizationStatus.rawValue]) }
            }
        case "deliver", "reconcile":
            center.getNotificationSettings { settings in
                DispatchQueue.main.async {
                    do {
                        let valid = try IdleDatabase(self.path).transaction { state, _ in
                            Set(state.notices.filter { ["posting", "pending"].contains($0.status) }.map(\.id))
                        }
                        self.center.getDeliveredNotifications { notifications in
                            let obsolete = notifications.filter { $0.request.content.categoryIdentifier == "inactive-target" && !valid.contains($0.request.identifier) }.map { $0.request.identifier }
                            self.center.removeDeliveredNotifications(withIdentifiers: obsolete)
                            DispatchQueue.main.async {
                                guard operation == "deliver", settings.authorizationStatus == .authorized else {
                                    self.finish(["authorized": settings.authorizationStatus == .authorized]); return
                                }
                                self.deliver()
                            }
                        }
                    } catch { self.finish(["error": String(describing: error)]) }
                }
            }
        default:
            // A notification response is dispatched after the application starts.
            // Plain launches exit without displaying or acting on anything.
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) { self.finish(["status": "idle"]) }
        }
    }
    func deliver() {
        do {
            guard let (notice, instance) = try idleClaimNotification(path) else { finish(["status": "nothing-due"]); return }
            let content = UNMutableNotificationContent()
            content.title = "\(notice.name) appears inactive"
            let memory = instance.target.memory.map { ByteCountFormatter.string(fromByteCount: Int64($0), countStyle: .memory) } ?? "memory unavailable"
            content.body = String(format: "PID %d · %@ · %.1f hours observed quiet. Force Quit may lose unsaved work.", instance.target.target.pid, memory, instance.quietSeconds / 3600)
            content.categoryIdentifier = "inactive-target"
            content.threadIdentifier = "resource-inspector-inactivity"
            // Only an opaque, locally resolved identifier crosses the notification boundary.
            content.userInfo = ["notice": notice.id]
            center.add(UNNotificationRequest(identifier: notice.id, content: content, trigger: nil)) { error in
                DispatchQueue.main.async {
                    do {
                        let accepted = try idleDelivered(self.path, id: notice.id, success: error == nil)
                        if !accepted { self.center.removeDeliveredNotifications(withIdentifiers: [notice.id]) }
                        self.finish(["status": error == nil ? "posted" : "failed", "error": error?.localizedDescription as Any? ?? NSNull()])
                    } catch { self.finish(["error": String(describing: error)]) }
                }
            }
        } catch { finish(["error": String(describing: error)]) }
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list])
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        guard response.notification.request.content.categoryIdentifier == "inactive-target",
              let id = response.notification.request.content.userInfo["notice"] as? String,
              id == response.notification.request.identifier else { completionHandler(); finish(["status": "ignored"]); return }
        if response.actionIdentifier == "force-quit" {
            let message: String
            do { message = try idleNotificationAction(path, id: id) }
            catch { message = "Nothing further was attempted: \(error)" }
            center.removeDeliveredNotifications(withIdentifiers: [id])
            let result = UNMutableNotificationContent()
            result.title = "Resource Inspector"
            result.body = message
            center.add(UNNotificationRequest(identifier: "result-\(id)", content: result, trigger: nil)) { _ in
                completionHandler()
                DispatchQueue.main.async { self.finish(["status": message]) }
            }
        } else if response.actionIdentifier == UNNotificationDefaultActionIdentifier {
            var components = URLComponents(string: "raycast://extensions/juhas96/resource-inspector/inactive")!
            let context = String(data: try! JSONSerialization.data(withJSONObject: ["noticeID": id]), encoding: .utf8)!
            components.queryItems = [URLQueryItem(name: "context", value: context)]
            if let url = components.url { NSWorkspace.shared.open(url) }
            completionHandler()
            finish(["status": "opened-details"])
        } else {
            // Dismissing or ignoring is never approval to terminate a target.
            completionHandler()
            finish(["status": "dismissed"])
        }
    }
}

umask(0o077)
LSRegisterURL(Bundle.main.bundleURL as CFURL, true)
let application = NSApplication.shared
let delegate = NotificationDelegate()
application.delegate = delegate
application.setActivationPolicy(.accessory)
application.run()
