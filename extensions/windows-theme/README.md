# Toggle Windows Theme

<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/speedtest/assets/speedtest.png?raw=true"
    width="50"
  />

Quickly toggle **Light / Dark mode** on Windows using Raycast.

  <p>
    <a href="">
      <img src="https://img.shields.io/badge/Raycast-store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/raycast/extensions/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="raycast-extensions is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
    <a href="https://x.com/DeepH80082">
      <img
        src="https://img.shields.io/twitter/follow/tonka_2000.svg?label=Follow%20@DeepH80082"
        alt="Follow @DeepH80082"
      />
    </a>
  </p>
</div>

This extension switches:
- App theme
- System theme

> ⚠️ **Note:** Due to Windows limitations, the **taskbar may not always update instantly (may be not not also)**. This is **for developers** who work with different themes. Taskbar takes time to change the Theme due to windows limited its access for security reasons.

---

## ✨ Features

- Toggle **Light ↔ Dark mode**
- Instant app & system theme switch
- Smooth Raycast toast feedback
- No admin permissions required

---

## 🚀 Usage

1. Open **Raycast**
2. Run **Toggle Windows Theme**
3. Theme switches automatically

You’ll see a short animation followed by a success message.

---

## ⚠️ Windows Limitation (Important)

Windows does **not fully apply taskbar theme changes** when themes are changed programmatically.

This is a **Windows OS limitation**, not a bug in this extension. ![alt text](image.png)

If the taskbar does not update visually:
1. Open **Settings → Personalization → Colors**
2. Toggle the theme once manually

This applies the theme exactly as Windows intends.

---

## 🛠 How It Works

The extension updates the following registry values (current user only):

- `AppsUseLightTheme`
- `SystemUsesLightTheme`
- `ColorPrevalence`
- `EnableTransparency`

These control app and system appearance, but **Windows UI still owns the final taskbar repaint**.

---

## 🔐 Permissions & Safety

- Uses **PowerShell**
- Modifies **HKCU (current user)** registry only
- No admin rights required
- No background services or telemetry

---

## 🖥 Supported Systems

- Windows 10
- Windows 11
- Raycast for Windows

---

## 🧠 Why not fully automatic?

Windows does not expose a public API to trigger the **system theme toggle action** itself.  
Only the Windows Settings UI can apply the theme perfectly.

This extension follows the **safe and stable approach**.

---

## ❤️ Credits

Built using:
- Raycast API
- PowerShell
- Windows Registry

### Imp Links that I refer

- [Set-ItemProperty and many more. look through it](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-itemproperty?view=powershell-7.5)
- [Example Repo](https://github.com/raycast/extensions/blob/main/extensions/speedtest/README.md?plain=1)
- [Raycast API Docs](https://developers.raycast.com/information/best-practices?q=toast)
- [Youtube Video](https://www.youtube.com/watch?v=RebAHGCJpMM) Thanks to Kelvin Omereshone
