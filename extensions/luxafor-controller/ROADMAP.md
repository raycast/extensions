# Roadmap

This roadmap outlines planned improvements for the Luxafor Controller Raycast extension.

## Near-term (v1.1 - v1.3)
- Preferences: Default startup color and optional blink duration
- Menubar: Add custom hex colors and recent colors
- Command: Quick-actions command for frequently used colors
- Error handling: Friendly error screens and retry suggestions
- **Custom Hex Color Input**: Color picker or hex input field in main interface
- **Color History**: Track last 5-10 colors used for quick access
- **Blink Duration Control**: Custom blink durations (1s, 2s, 5s, etc.)
- **Quick Actions Command**: Dedicated command for frequently used color combinations
- **Enhanced Error Handling**: Better error messages with retry suggestions
- **Startup Color Preference**: Remember and restore last color on app launch
- **Keyboard Shortcuts**: Global hotkeys for common actions (red/green toggle, turn off)

## Mid-term (v1.4 - v2.0)
- Color presets: Named presets with multi-step sequences
- Scenes: Timed patterns or daily schedules (requires local scheduler)
- Bluetooth variants: Surface device-specific notes for BT devices
- Status persistence: Optional local cache to restore last color on reboot
- **Color Presets**: Named color combinations (Work Mode, Focus Time, Break)
- **Pattern Sequences**: Multi-step color sequences with timing (red → yellow → green)
- **Daily Schedules**: Time-based color changes (morning=blue, afternoon=green, evening=off)
- **Workspace Integration**: Auto-color based on calendar status, Slack presence, or focus mode
- **Device-Specific Features**: Optimize for different Luxafor models (Flag vs Orb vs Bluetooth)
- **Status Persistence**: Local cache to restore last known state across reboots
- **Advanced Blink Patterns**: Wave, fade, or custom blink sequences
- **Color Temperature**: Warm/cool white variations and brightness control

## Long-term (v2.0+)
- Multi-device support (select device where applicable)
- Workspace integrations (Slack, Calendar) to set presence via webhooks
- CI/CD: Automated release workflow to Raycast Store
- **Multi-Device Support**: Control multiple Luxafor devices simultaneously
- **API Rate Limiting**: Smart request throttling to avoid API limits
- **Offline Mode**: Queue commands when device is offline, execute when back online
- **Webhook Integration**: Listen for external triggers (GitHub status, CI/CD results)
- **Automation Rules**: "If X happens, set color to Y" logic
- **Performance Monitoring**: Track response times and device health metrics
- **Plugin System**: Allow third-party integrations and custom patterns
- **Mobile Companion**: iOS/Android app for remote control

## Technical Improvements
- **State Synchronization**: Better sync between menubar and main interface
- **Memory Optimization**: Reduce unnecessary re-renders and state updates
- **Error Recovery**: Automatic retry with exponential backoff
- **Logging System**: Structured logging for debugging and monitoring
- **Unit Tests**: Comprehensive test coverage for core functionality
- **Performance Profiling**: Identify and fix performance bottlenecks

Suggestions and PRs welcome!
