# BluePomodoro Raycast Extension

Manage your ADHD-friendly, gamified focus timer, tasks, and productivity statistics directly from Raycast.

## Features

- ⏱️ **Focus Timer**: Start, pause, reset, or skip pomodoro work and break sessions. Renders a beautiful Apple-style visual widget inline.
- 📋 **Manage Tasks**: View, create, toggle status, and set your current active focus task.
- 🏆 **Productivity Stats**: Track your daily stats, current focus streak, and total points.
- 💻 **Menu Bar Timer**: A lightweight indicator that keeps you updated on your current session directly in your macOS menu bar.

## Installation & Configuration

To connect this extension with your personal **BluePomodoro** dashboard, you will need to configure the following preferences in Raycast:

1. **Base URL**: The address of your hosted BluePomodoro web application.
   - For local development, use: `http://localhost:9002`
   - For your hosted app, use your custom production URL (e.g., `https://your-app.vercel.app`).
2. **API Token**: A secure personal access token linking Raycast to your user profile.
   - Open your BluePomodoro web app.
   - Navigate to **Configuración** (Settings) -> **Integraciones** (Integrations).
   - Click the "Mostrar Token" button and copy the token to your clipboard.
   - Paste this token into the Raycast preferences prompt.

## License

This extension is licensed under the MIT License.
