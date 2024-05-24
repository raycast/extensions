import SwiftUI
import UserNotifications

@main
struct TimerNotifHelper: App {
    @State var notifDelegate: UNUserNotificationCenterDelegate = TimerNotifDelegate();

    init() {
        let notifCenter = UNUserNotificationCenter.current();
        notifCenter.delegate = notifDelegate;

        let timerName = CommandLine.arguments[1];
        Task() {
            await scheduleNotif(timerName: timerName)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 60 * 3) {
            exit(0);
        }
    }

    var body: some Scene {
        MenuBarExtra("TimerNotifHelper", systemImage: "app.badge") {
            Button("Quit") {
                exit(0);
            }
        }
    }
}

func scheduleNotif(timerName: String) async -> Void {
    // obtain notification permissions
    let notifCenter = UNUserNotificationCenter.current()
    do {
        try await notifCenter.requestAuthorization(options: [.alert])
    } catch {
        print("Could not obtain notification permission!")
        exit(1);
    }

    // set up actions
    let dismissTimerAction = UNNotificationAction(
        identifier: "dismissTimerAction",
        title: "Dismiss Timer"
    )
    let manageTimersAction = UNNotificationAction(
        identifier: "manageTimersAction",
        title: "Manage Timers..."
    )
    let category = UNNotificationCategory(
        identifier: "timerNotif",
        actions: [dismissTimerAction, manageTimersAction],
        intentIdentifiers: []
    )
    notifCenter.setNotificationCategories([category])

    // create banner notification
    let content = UNMutableNotificationContent()
    content.title = "Ding!"
    content.subtitle = "Timer \"\(timerName)\" complete."
    content.categoryIdentifier = "timerNotif"
    let trigger = UNTimeIntervalNotificationTrigger(
        timeInterval: 1,
        repeats: false
    )

    // send notification
    let request = UNNotificationRequest(
        identifier: UUID().uuidString,
        content: content,
        trigger: trigger
    )
    do {
        try await notifCenter.add(request)
    } catch {
        print("Could not add notification to notifCenter!")
        exit(1);
    }
}


class TimerNotifDelegate: NSObject, UNUserNotificationCenterDelegate {
    @Environment(\.openURL) var openURL

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        print("Received dismiss action.")
        switch response.actionIdentifier {
            case "dismissTimerAction":
                print("Dismiss action launching...")
                openURL(URL(string: "raycast://extensions/ThatNerd/timers/dismissTimerAlert")!)
            case "manageTimersAction":
                print("Manage Timers action launching...")
                openURL(URL(string: "raycast://extensions/ThatNerd/timers/manageTimers")!)
            default:
                break
        }
        completionHandler()
    }
}
