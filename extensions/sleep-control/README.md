# Sleep Control

Allow or prevent Mac sleep from Raycast, with a moon or sun in the menu bar showing the current setting.

Sleep Control changes macOS's global sleep-prevention setting on battery and charger. It is intended to keep your Mac working with the lid open or closed. The display can still turn off, and the setting remains until you change it again, even if you quit Raycast.

## Use

- **Sleep Control Menu Bar** adds the status icon. Open its menu and choose **Prevent Sleep** or **Allow Sleep**. An optional preference adds an **Awake** or **Sleep** label beside the icon.
- **Sleep Control** opens the native controls and permission settings.
- **Toggle Sleep Prevention** switches the current setting directly. You can assign it a Raycast hotkey.

The moon means **Sleep Allowed**; the sun means **Staying Awake**. Sleep Allowed restores normal macOS sleep behavior; other apps can still keep your Mac awake. The menu bar refreshes about once a minute, and **Refresh Status** checks again immediately. If the setting cannot be read, the extension shows **Status Unavailable**.

Changes use the normal macOS administrator dialog when approval is needed. No Terminal setup, additional executable download, or online account is required. Sleep Control makes no runtime network requests and never stores your administrator password.

## Optional quick switching

Open **Sleep Control**, select **Quick Switching**, and choose **Enable Quick Switching**. After a confirmation and native macOS administrator approval, your account can run exactly these two commands without repeated password prompts:

```sh
/usr/bin/pmset -a disablesleep 0
/usr/bin/pmset -a disablesleep 1
```

This permission applies to your macOS account, including other apps and processes running as you. It is not restricted to Raycast. Other administrator commands keep their existing permissions. The setup indicator confirms that this grant is installed; another security policy on your Mac may still require approval. Each switch falls back to the native macOS dialog when needed.

The permission is stored at `/private/etc/sudoers.d/raycast-sleep-control`, owned by `root:wheel` with mode `0440`. Setup validates the sudoers configuration and refuses to replace a conflicting file. Enabling or removing quick switching does not change the current sleep setting.

To revoke it, choose **Remove Quick Switching** in the same controls and approve the macOS dialog. If in-app removal is unavailable, the manual recovery command in Terminal removes only this policy file:

```sh
sudo rm -f /private/etc/sudoers.d/raycast-sleep-control
```

Choose **Allow Sleep** and remove quick switching before uninstalling. Removing the extension alone does not undo either system setting.

## Hardware behavior

Allow sleep before putting your Mac in a bag. macOS critical-battery and thermal protection can take precedence over sleep prevention.

A physical closed-lid test has not yet been completed for this release, and behavior across Mac models has not been verified. The extension reads back the macOS setting after a change; that check does not prove that hardware will remain awake in every situation.

## Development and publication

```sh
npm install
npm run dev
```

Use `npm test`, `npm run lint`, and `npm run build` to check a local checkout. `npm run publish` starts the Raycast Store submission workflow. Publication requires review and is not automatic; this documentation does not indicate that the extension has been published or installed.

MIT licensed. Copyright (c) 2026 Vayun.
