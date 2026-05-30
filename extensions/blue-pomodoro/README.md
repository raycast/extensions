# ⏱️ BluePomodoro Raycast Extension

Supercharge your focus with **BluePomodoro**, a premium, watchOS-inspired pomodoro timer and task manager designed to keep you in the zone. Seamlessly synchronized with your BluePomodoro web application, this extension brings ADHD-friendly, gamified focus timer, tasks, and productivity statistics directly to your Raycast command palette.

---

## 🚀 Key Features

* **Apple watchOS-Inspired Widget**: A circular, glowing visual progress ring (blue for focus, emerald green for breaks) showing your remaining time inside a neat grid layout.
* **ADH-Friendly Reminders**: Dynamically rotates status animations to keep your mind stimulated and prevent focus fatigue.
* **Unified Task Board**: View, edit, select, and mark tasks complete with native color-coded priority and status tags.
* **Gamified Productivity**: Watch your focus streak grow and gain points (+100 pts per session) synced in real-time to your profile.
* **macOS Menu Bar Indicator**: A lightweight indicator in the system menu bar to keep you updated on your current pomodoro block.

---

## 📦 Commands Included

1. **Focus Timer (`focus-timer`)**: The main control board to start, pause, reset, or skip pomodoro work and break blocks.
2. **Manage Tasks (`manage-tasks`)**: Create, select, and track specific tasks. Sets the active focus task visible in your widget.
3. **Productivity Stats (`stats`)**: Detailed report of your focus streaks, completed blocks, and historical point milestones.
4. **Menu Bar Indicator (`menu-bar`)**: A persistent menu bar menu to control sessions and see the countdown at a glance.

---

## ⚙️ Configuration & Setup

To link the Raycast extension to your personal BluePomodoro account:

1. Open your **BluePomodoro Web App** (e.g., [bluepomodoro.joaquingz.com.ar](https://bluepomodoro.joaquingz.com.ar)).
2. Go to **Configuración** (Settings) -> **Integraciones** (Integrations).
3. Under the **Raycast** card, click **Mostrar Token** and copy the personal API Token.
4. Open Raycast, run any BluePomodoro command, and fill in the preferences:
   * **Base URL**: Set your hosted web app URL (e.g., `https://bluepomodoro.joaquingz.com.ar`).
   * **API Token**: Paste the token copied from your settings.

---

## 🛠️ Local Development

If you want to contribute or test changes locally:

```bash
# Clone the repository
git clone https://github.com/joaquingonzalezzanotti/BluePomodoro.git
cd BluePomodoro/extensions/blue-pomodoro

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## 📄 License

This project is licensed under the MIT License.
