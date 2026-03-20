# KVM Switcher

A cross-platform KVM switcher for **macOS** and **Windows**, designed for displays with built-in KVM and DDC/CI support. Seamlessly switch between HDMI, DisplayPort, and Type-C (DisplayPort) inputs using Raycast.

## ⚙️ Prerequisites & Setup

This extension is designed to be as "zero-config" as possible for both platforms.

### For macOS
The extension relies on a lightweight tool called `m1ddc`.
* **Auto-Install:** The extension will attempt to install this for you automatically via Homebrew the first time you run a command.
* **Requirement:** You must have **[Homebrew](https://brew.sh/)** installed on your Mac.

### For Windows
* **Zero-Install:** There are **no external tools to download or install.**
* **Native Execution:** The extension uses a native C# script executed via PowerShell to communicate directly with your monitor's hardware APIs (`dxva2.dll`). This works out-of-the-box on a clean Windows 10 or 11 installation.

---

Finding the exact code for your monitor's input ports requires a little trial and error, as manufacturers often assign them differently. Below are the most common industry-standard DDC/CI Virtual Control Panel (VCP) codes:

| Input Type | VCP Code (Decimal) | VCP Code (Hex) | VESA Standard Name |
| :--- | :--- | :--- | :--- |
| **VGA 1** | `1` | `0x01` | VGA-1 |
| **DVI 1** | `3` | `0x03` | DVI-1 |
| **DisplayPort 1** | `15` | `0x0F` | DisplayPort-1 |
| **DisplayPort 2** | `16` | `0x10` | DisplayPort-2 |
| **HDMI 1** | `17` | `0x11` | HDMI-1 |
| **HDMI 2** | `18` | `0x12` | HDMI-2 |

Modern monitors often map "Newer" ports (like USB-C) to "Older" VESA standard addresses because the VESA MCCS spec was finalized before USB-C became a standard video connection.

* **Example:** For many **MSI Modern Series** monitors, the **USB-C (DisplayPort Alt Mode)** input is internally mapped to **HDMI 2 (Code 18)**.
* If your USB-C port is not responding to code `18`, it is likely mapped to `15` (DisplayPort 1) or `27` (0x1B).

## ⚠️ Hardware Compatibility & Limitations

This extension sends hardware commands directly to your monitor's internal firmware using the **DDC/CI** (Display Data Channel Command Interface) protocol.

* **Enable DDC/CI:** You *must* manually enable "DDC/CI" or "PC Control" inside your monitor's physical OSD (On-Screen Display) menu.
* **Apple Silicon Native HDMI Port:** On Mac M-series chips, DDC/CI communication is often blocked on the built-in HDMI port. For best results, connect via USB-C, Thunderbolt, or a USB-C to DP/HDMI adapter.
* **Cables & Hubs:** Certain USB-C hubs and "passive" adapters do not pass DDC/CI signals. If the extension is failing, try connecting the monitor directly to your computer.

---

## 🖥 Known Compatible Monitors

This extension works with any monitor that correctly implements standard VESA MCCS input switching, including:

* **MSI:** Modern Series (e.g., MD272QXPW, MD272PW, MD272QXP)
* **Dell:** UltraSharp Series (e.g., U2723QE, U3223QE) and P-Series (e.g., P2722HE)
* **Gigabyte:** M-Series (e.g., M27Q, M32U, M34WQ)
* **BenQ / ASUS / AOC:** Various productivity models with built-in KVM switches.

---

## Technical Implementation (For Reviewers)

To ensure a seamless cross-platform experience without bundling suspicious binaries:

- **macOS:** Uses `child_process` to execute `m1ddc` via shell. Includes an auto-dependency checker for Homebrew.
- **Windows:** Reads a local `MonitorSwitcher.cs` asset and executes it via PowerShell's `Add-Type` functionality. This compiles the C# code in memory at runtime to call `SetVCPFeature` from `dxva2.dll`. This approach avoids the need for external `.exe` files.

## 📚 Technical References

- **VESA MCCS Standard:** [Input Source Selection (VCP 60)](https://www.ddcutil.com/vcpinfo_output/#vcp-code-60-input-source-selects-active-video-source) — Detailed breakdown of how different MCCS versions (2.0, 2.1, 2.2, 3.0) handle input values.
- **Win32 API:** [SetVCPFeature Function](https://learn.microsoft.com/en-us/windows/win32/api/lowlevelmonitorconfigurationapi/nf-lowlevelmonitorconfigurationapi-setvcpfeature) — Official Microsoft documentation for the hardware-level function used in the Windows implementation.