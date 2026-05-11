# No More Caffeine Changelog

## [Initial Version] - 2026-03-11

### ✨ Features

- **Residual Caffeine Calculation** - Calculate remaining caffeine in your system using exponential decay formula
- **Bedtime Prediction** - Predict residual caffeine levels at your bedtime to avoid sleep disturbances
- **Status Indicators** - Three-level status system (Safe, Warning, No More Caffeine) based on predicted impact
- **Quick Logging** - Log caffeine intake with built-in presets (Coffee, Espresso, Tea, Energy Drink, Green Tea, Cola)
- **Custom Drinks** - Create and manage custom drink presets with preferred caffeine amounts
- **Intake History** - View all caffeine intake organized by date with timestamps
- **Menu Bar Integration** - Monitor caffeine status directly from menu bar with real-time updates
- **Today's Summary** - View current residual caffeine, predicted bedtime levels, and daily total

### 📱 Commands

- **Log Caffeine** - Log intake and see predicted impact on bedtime levels
- **Today's Caffeine** - View history, current residual, and predicted bedtime levels
- **Caffeine Settings** - Configure bedtime, half-life, thresholds, and manage custom drinks
- **Caffeine Status** - Menu bar command showing current status with quick access to all features

### ⚙️ Settings

- **Bedtime** - Configure your usual bedtime (HH:mm format, default: 22:00)
- **Caffeine Half-Life** - Adjust based on your metabolism (default: 5 hours)
- **Max Residual at Bedtime** - Set maximum allowed residual caffeine at bedtime (default: 50 mg)
- **Daily Max Caffeine** - Optional daily caffeine limit (recommended: 200-400 mg)

### 🎨 UI/UX

- **Color-coded Status** - Visual indicators (Green/Orange/Red) for quick status recognition
- **Organized History** - Intake history grouped by date with clear timestamps
- **Quick Actions** - Keyboard shortcuts for common actions (`⌘ ⇧ Delete` to delete, `⌘ R` to refresh)
- **Menu Bar Sections** - Organized menu bar with information and action sections

### 🔧 Technical

- **Exponential Decay Model** - Accurate calculation using `R(t) = A × 0.5 ^ ((t - t0) / T1/2)`
- **TypeScript** - Full type safety throughout the codebase
- **Local Storage** - Persistent data storage for intake history and custom drinks
- **Real-time Updates** - Menu bar updates every minute with latest calculations
