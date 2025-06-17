# Battery Remaining Time - Raycast Extension

> A sleek Raycast extension that displays real-time battery information with time remaining directly in your macOS menu bar.

## ✨ Features

### 🔋 Smart Battery Display
- **Integrated Time Display**: Shows remaining time directly after the battery icon when available
- **Simple Status Indicators**: Clear ⚡ when charging, 🔋 when on battery
- **Intelligent Status Detection**: Automatically detects charging and discharging states
- **Compact Time Display**: Shows time in space-efficient format (e.g., "2h15" or "45m") only when available and not 00:00

### 📊 Comprehensive Battery Info
- **Real-time Updates**: Background refresh every 30 seconds + manual updates every 10 seconds when active
- **Battery Health Monitoring**: Shows battery condition and cycle count
- **Temperature Monitoring**: Displays battery temperature when available
- **Power Source Detection**: Identifies whether running on AC power or battery

### 🎨 Visual Indicators

| Status | Icon | Example Display | Description |
|--------|------|-----------------|-------------|
| On Battery | 🔋 | `🔋2h15` or `🔋45m` | Battery icon with compact time remaining |
| On Battery (No Time) | 🔋 | `🔋` | Battery icon when time unavailable |
| Charging | ⚡ | `⚡1h30` or `⚡25m` | Lightning bolt with compact time to full charge |
| Charging (No Time) | ⚡ | `⚡` | Lightning bolt when time unavailable |

## 🚀 Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/ataberkcemunal/BatteryRemainingTime-Raycast.git
   cd BatteryRemainingTime-Raycast
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Run the extension**
   - Open Raycast
   - Search for "Battery Remaining Time"
   - Run the command to activate the menu bar display

### Building for Production

```bash
npm run build
```

## 📱 Usage

### Menu Bar Display
Once activated, the extension displays a battery icon with time remaining in your menu bar:
- **Click the icon** to open detailed battery information
- **Icon updates automatically** based on battery status and charge level
- **Time format**: Compact display (`2h15`, `45m`) or just icon when unavailable

### Detailed Information Panel
Click the menu bar icon to access:

**Battery Status**
- Current charge level (percentage)
- Charging/discharging status  
- Remaining time estimate
- Power source (AC Power/Battery)

**Battery Health**
- Battery condition (Normal/Replace Soon/etc.)
- Charge cycle count
- Temperature (when available)

**Quick Actions**
- Access extension preferences
- View all battery metrics at a glance

## ⚙️ Configuration

The extension automatically configures itself with optimal settings:
- **Background Updates**: Every 30 seconds
- **Active Updates**: Every 10 seconds when menu is open
- **Smart Time Detection**: Handles various pmset output formats
- **Fallback Handling**: Graceful degradation when system commands are unavailable

## 🔧 Development

### Project Structure
```
BatteryRemainingTime-Raycast/
├── src/
│   └── battery-status.tsx    # Main extension logic
├── assets/                   # Extension assets
├── package.json             # Project configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix ESLint issues

### System Dependencies
The extension relies on macOS system commands:
- `pmset -g batt` - Battery status and time remaining
- `system_profiler SPPowerDataType` - Detailed battery information
- `powermetrics` - Battery temperature (optional, requires sudo)

## 🛠️ Troubleshooting

### Common Issues

**Battery time shows `--:--`**
- This is normal when macOS is calculating battery time
- Usually resolves within a few minutes of unplugging/plugging charger

**Temperature not displaying**
- Temperature requires `sudo` permissions for `powermetrics`
- Extension works normally without temperature data

**Menu bar icon not updating**
- Ensure background refresh is enabled in Raycast preferences
- Try restarting the extension by running it again from Raycast

**Extension not appearing in menu bar**
- macOS may hide menu bar items if the bar is full
- Try using tools like HiddenBar or Bartender to manage menu bar space

## 🔒 Privacy & Security

- **Local Only**: All data processing happens locally on your device
- **No Network Requests**: Extension doesn't send data anywhere
- **System Commands Only**: Uses standard macOS battery monitoring commands
- **No Data Collection**: No personal information is collected or stored

## 📋 System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Raycast**: Latest version recommended
- **Node.js**: 16.0+ (for development)
- **TypeScript**: 5.0+ (for development)

## 🤝 Contributing

Contributions are welcome! Please feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the amazing [Raycast](https://raycast.com/) platform
- Inspired by the need for better battery monitoring on macOS
- Thanks to the Raycast community for feedback and support

---

**Made with ❤️ for the Raycast community** 