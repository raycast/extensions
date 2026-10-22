# App Instances (Raycast Extension)

A lightning-fast Raycast extension that lists, searches, and switches between all running instances and windows of applications on macOS.

## Performance & Architecture

- ⚡ **Ultra-Fast Native Engine**: Powered by a multi-threaded C/Objective-C universal helper (`assets/window-helper`) using native macOS Accessibility (`AXUIElement`) APIs across CPU cores. Window lists query in **~100ms** (over **100x faster** than legacy AppleScript sequential loops).
- 🚀 **Zero Perceived Latency (`useCachedPromise`)**: Automatically renders the cached window list immediately upon opening with zero spinner delay, revalidating smoothly in the background.
- 🎯 **Instant Window Focus**: Native window activation and raising (`AXRaise` / `AXMain`) executes in under 5ms, immediately dismissing Raycast for a seamless transition.
- 🛡️ **Resilient Fallback**: Automatically falls back to an optimized batch AppleScript query if the native helper is unavailable.

## Features

- 🔍 **Search & Filter**: Search across all windows by title or filter by specific application.
- 🎨 **Native App Icons**: Shows real macOS application icons directly in the search results.
- 🪟 **Minimized Window Indicator**: Visual badges for minimized windows.
- ⚡ **Quick Focus**: Jump directly to any open window (`Enter`).
- ❌ **Close Window**: Close open windows directly from Raycast (`Cmd + Shift + W`).
- 🔄 **Live Refresh**: Reload windows on demand (`Cmd + R`).
- 📋 **Copy Actions**: Copy window titles (`Cmd + C`) or application names (`Cmd + Shift + C`).

## Setup & Development

1. Open a terminal in this directory:
   ```bash
   cd "raycast-app-instances"
   ```

2. Build helper and extension:
   ```bash
   npm run build
   ```

3. Run in development mode in Raycast:
   ```bash
   npm run dev
   ```

## macOS Permissions

This extension uses macOS Accessibility APIs (`AXUIElement`) to inspect open windows and bring them to the front. Make sure **Raycast** is granted **Accessibility** access:
- Open **System Settings** → **Privacy & Security** → **Accessibility**
- Ensure **Raycast** is enabled.
