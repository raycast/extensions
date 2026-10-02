<p align="center">
  <img src="./assets/logo.png" height="128">
  <h1 align="center">Coffee Extension</h1>
</p>

**Coffee** is a Raycast extension designed to manage the caffeination of your computer. Whether you want to keep your computer awake for a specific period, while a particular app is running, or on a schedule, Coffee has you covered.

## Installation 🛠️

To install the Coffee extension, follow these steps:

1. Open Raycast.
2. Search for "Store" and navigate to the Raycast Store.
3. Search for "Coffee" and click "Install."

## Usage 🚀

Once installed, simply trigger the Raycast command palette and search for the desired caffeination command.

<p align="center">
  <img src="./metadata/coffee-1.png" alt="Raycast Command Palette with Coffee Commands">
</p>

## Features ✨

### 1. **Caffeinate/Decaffeinate**

Keep your computer awake indefinitely or cancel the caffeination.

### 2. **Toggle Caffeination**

Toggle between keeping your computer caffeinated and in a decaffeinated state.

### 3. **Caffeinate For**

Caffeinate your computer for a specified amount of time.

<p align="center">
  <img src="./metadata/coffee-2.png" alt="Caffeinate For Command">
</p>

### 4. **Caffeinate While**

Keep your computer awake as long as a specific app is running.

<p align="center">
  <img src="./metadata/coffee-3.png" alt="Caffeinate While Command">
</p>

### 5. **Schedule Caffeination**

Set up a custom caffeination schedule using natural language.  
Examples:

> ⏳ Schedule for everyday except Tuesday from 13:00 to 20:00  
> ⏳ Schedule for Monday and Thursday from 09:00 to 14:00  
> ⏳ Schedule from 10:00 to 16:30 (adds schedule for all days)  
> ⏳ Saturday and Sunday from 20:00 to 23:30

Supported Actions:

- Add a Schedule
- Pause/Resume Schedule
- Delete a Schedule

> 📋 **Note:** If you pause a schedule, you must manually resume it for it to work the next week or any future instances.

<p align="center">
  <img src="./metadata/coffee-4.png" alt="Schedule Caffeination Command">
</p>

### 6. **Caffeination Status**

Get the current state of caffeination.

### 7. **Caffeinate Status Menu Bar**

Get the status of current caffeination in your menu bar.

### 8. **Auto-Caffeinate on Launch**

Optionally have Coffee start caffeinating your computer (indefinitely) automatically whenever Raycast launches. Enable the **Start caffeination when Raycast starts** toggle under the **Launch** section in the extension's preferences.

> **Requirements:** Either the _Caffeinate Status_ command (15 s background interval) or the _Caffeinate Status Menu Bar_ command (1 m background interval) must be enabled in Raycast — the auto-start feature piggybacks on these background ticks.

**How session detection works:** Coffee tracks the Raycast process PID. A new PID means Raycast actually relaunched, so the computer is caffeinated automatically. Putting the computer to sleep and waking it does **not** trigger a re-caffeination, because the PID stays the same — your manual decaffeination is honoured until you truly restart Raycast.
