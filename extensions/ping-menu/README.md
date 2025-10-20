# Ping Menu - Raycast Extension

A minimalistic Raycast menu bar extension that displays ping latency to google.com.

## Features

- 🎯 **Real-time monitoring**: Pings google.com every second while active
- 📊 **Menu bar display**: Shows current latency in milliseconds
- 📜 **Ping history**: Click to see the last 10 ping results
- 🎨 **Visual indicators**: Icon changes based on latency (green for good, yellow for moderate, red for high/failed)
- 💾 **Cached results**: Shows last known ping when reopened

## Important Note

**Background Execution Limitation**: Due to Raycast's architecture, the extension process is suspended when the menu bar is closed to conserve system resources. This means:

- ✅ **Active monitoring**: Updates every second while the menu bar is visible or dropdown is open
- ✅ **Instant resume**: Starts pinging immediately when you click on it
- ✅ **Cached display**: Shows last known ping value when reopening
- ⏸️ **Pauses when closed**: Pinging stops when you close the dropdown (Raycast platform limitation)

This seems to be standard behavior for Raycast menu bar extensions and cannot be changed within the extension API.
