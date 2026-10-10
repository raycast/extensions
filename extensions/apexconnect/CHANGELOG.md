# Apex Connect Changelog

## [Bug Fixes] - 2026-10-08

- Fix camera cache files written as .jpg instead of .png (content was always JPEG)
- Fix Wi-Fi SSID detection on macOS 14.4+ by switching from the removed `airport` binary to `networksetup`
- Fix the shared WebSocket connection to follow network changes on reconnect instead of retrying an unreachable host forever
- Fix the climate temperature picker excluding the device's actual maximum, and clamp Increase/Decrease to the device's allowed range
- Fix the notifications menu bar icon never visually indicating pending notifications
- Fix a false "entity not found" error shown by the weather menu bar during initial load
- Fix Assist hanging indefinitely when the pipeline list comes back empty
- Move failure toasts out of render into a shared hook to stop duplicate/repeated toasts

## [Initial Version] - 2026-10-07

- Publish Apex Connect for ApexOS
