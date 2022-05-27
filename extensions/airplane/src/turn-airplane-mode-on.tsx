import { closeMainWindow, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import wifi from "manage-wifi";
import fixPath from "fix-path";

fixPath();

export default async () => {
  await wifiOff();
  await bluetoothOff();
  await closeMainWindow();
  await showHUD("Airplane is turned on");
};

async function wifiOff() {
  const isWifiOn = await wifi.isOn();

  if (isWifiOn) {
    await wifi.off();
  }
}

async function bluetoothOff() {
  const isEnabled = await runAppleScript(
    'set value to do shell script "system_profiler SPBluetoothDataType | grep State"'
  );

  if (isEnabled.includes("On")) {
    runAppleScript(
      'tell application "System Preferences" \n set current pane to pane "com.apple.preferences.Bluetooth" \n end tell \n delay 1 \n tell application "System Events" \n tell application process "System Preferences" \n click button 1 of window "Bluetooth" \n set uiElems to entire contents \n end tell \n end tell \n delay 0.3 \n if application "System Preferences" is running then \n tell application "System Preferences" to quit \n end if'
    );
  }
}

//tell application "System Preferences" \n set current pane to pane "com.apple.preference.notifications" \n end tell \n delay 0.5 \n tell application "System Events" \n tell application process "System Preferences" \n click radio button "Focus" of tab group 1 of window "Notifications & Focus" \n set theCheckbox to checkbox 1 of group 1 of tab group 1 of window "Notifications & Focus" \n tell theCheckbox \n set theCheckboxStatus to value of theCheckbox as boolean \n return theCheckboxStatus \n end tell \n end tell \n end tell \n delay 0.3 \n if application "System Preferences" is running then \n tell application "System Preferences" to quit \n end if

// 'tell application "System Events" \n tell dock preferences to set autohide to not autohide \n end tell'
//'tell application "System Preferences" \n set current pane to pane "com.apple.preferences.Bluetooth" \n end tell \n delay 1 \n tell application "System Events" \n tell application process "System Preferences" \n click button 1 of window "Bluetooth" \n set uiElems to entire contents \n end tell \n end tell \n delay 0.3 \n if application "System Preferences" is running then \n tell application "System Preferences" to quit \n end if'
