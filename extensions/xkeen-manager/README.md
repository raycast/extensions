> 🇷🇺 Русская версия: [README.ru.md](README.ru.md)

# XKeen Manager for Raycast

**XKeen Manager** — the ultimate control panel for Xray (the `xkeen` package) on Keenetic routers.
Monitor status, switch servers, and manage routing rules without touching the terminal.

## ✨ Features

*   🚀 **Full Control:** Start, Stop, Restart with status indication (Green/Red) and operational mode.
*   🌍 **Smart IP Check:** Hybrid verification showing your real ISP IP (router request) and VPN IP (Mac request), so you know exactly if the bypass is working.
*   🔄 **Profile Manager:**
    *   Create different profiles for different countries/servers.
    *   Switch on the fly. The script safely replaces the server config (`04_outbounds.json`).
    *   *Auto-Sync:* If you edit the active profile's config, changes save to both the live config and the profile backup.
*   📝 **JSON Editor:** Built-in editor for `Routing` and `Outbounds` with syntax validation.
*   📜 **Logs:** View recent Xray events (newest at the top).

### New Features

*   **Menu Bar:** The "XKeen Menu Bar" command displays a colored status indicator (green = running, red = stopped, orange = connection error). Switch profiles and restart directly from the menu with background updates every 10 minutes.
*   **AI Tools:** Manage through Raycast AI — `get-status`, `list-profiles`, `switch-profile`, `add-domains` commands with confirmations for state-changing actions.
*   **Preferences:** "Proxy Outbound Tag" setting for specifying the outbound node tag; leave empty to auto-detect from `04_outbounds.json`.

## 🛠 Requirements

1.  **macOS** (Raycast is Mac-only).
2.  **Keenetic** router with [Entware](https://github.com/Entware/Entware) installed.
3.  Installed **xkeen** package (original or forks like jameszeroX).

## ⚙️ Installation & Setup

### Step 1. Install the extension
1.  Clone the repository and install dependencies:
    ```bash
    npm install
    ```
2.  Add to Raycast:
    ```bash
    npm run dev
    ```

### Step 2. Configure SSH Connection (The Magic!)
To make the extension work instantly without asking for a password every 5 seconds:

1.  Find the **Setup SSH Connection** command in Raycast (included in the package).
2.  Press Enter. A terminal will open.
3.  Enter your router IP (usually `192.168.1.1`) and admin password.
4.  The wizard will automatically:
    *   Generate SSH keys.
    *   Upload them to the router.
    *   Configure `~/.ssh/config` with `ControlMaster` optimization (10x faster + ban protection).

**What the wizard does locally:** if `~/.ssh/id_ed25519` doesn't exist, it generates a new Ed25519 key **without a passphrase** (so Raycast can connect without prompting), copies the public key to the router via `ssh-copy-id`, and appends a `Host` block to `~/.ssh/config` with `ControlMaster` settings. Nothing else on your Mac is modified.

### Step 3. Finalize
1.  Launch **XKeen Manager**.
2.  On first run, configure settings (unless you changed them in the wizard):
    *   **SSH Connection:** `xkeen` (or your custom alias).
    *   **Paths:** Keep defaults if you have standard Entware (`/opt/etc/xray...`).

---

## 📖 Working with Profiles

1.  Go to **Switch Profiles**.
2.  Press **Create** and enter a name (e.g., `germany`).
    *   The extension creates a copy of the current server, saves it as profile `germany`, and immediately switches to it.
3.  Now go to the main menu → **Outbounds**.
4.  Paste your German server's VLESS config and press **Save**.
5.  Done! The config is now bound to the `germany` profile.

To revert to your previous server, just select it from the profiles list and press Enter.

## 🤝 Troubleshooting

*   **Status: Command failed / Connection reset:**
    The router temporarily blocked you for frequent requests.
    1. Reboot the router.
    2. Be sure to complete **Step 2 (Setup SSH Connection)** to enable connection optimization.
*   **IP Error:**
    Make sure the `2ip.io` site is added to Xkeen routing as a proxied domain.

---

## 📄 License

MIT
