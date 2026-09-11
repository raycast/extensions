# Changelog

## [1.0.0] - 2025-11-07


### Added
- Launched the initial version of the Ping Menu extension
- Monitors ping to google.com by default in the menu bar, updating in real-time
- Offers a flexible ping function to handle any hostname or IP address
- Refresh behaviour varies by mode: standard mode uses Raycast's background interval, while aggressive mode utilises React's setInterval
- Displays current latency in milliseconds, accompanied by a coloured dot for quick status indication
- Latency under 60ms is marked with a green dot, under 150ms with an orange dot, and higher latency is indicated by a red dot
- Includes a dropdown menu listing the last 10 ping results, complete with timestamps
- Hovering over the menu provides a tooltip with the current latency and the time of the last update