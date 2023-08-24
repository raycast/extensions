import Foundation

func getSelectedValue() -> String {
  if CommandLine.argc < 2 {
    print("No arguments passed. Please pass one of the following values: \"Always\", \"Automatic\", \"WhenScrolling\".")
    exit(1)
  }

  let args = CommandLine.arguments
  let value = args[1]

  if value != "Always" && value != "Automatic" && value != "WhenScrolling" {
    return "Automatic"
  }

  return value
}

func setScrollBars(_ value: String) {
  let domain = "AppleShowScrollBars"

  UserDefaults.standard.setPersistentDomain(
    [domain: Optional(value) as Any],
    forName: UserDefaults.globalDomain
  )

  let notifyEvent = Notification.Name("AppleShowScrollBarsSettingChanged")
  DistributedNotificationCenter.default().post(name: notifyEvent, object: nil)
}

let value = getSelectedValue()
setScrollBars(value)
