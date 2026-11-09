# RameCast Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Cast Screen: low-latency screen mirroring to Google Cast devices (Cast Streaming, like Chrome), with a video-stream fallback
- Latency preference (Auto / Lowest / Balanced / Smooth); Auto adjusts the device buffer live from packet loss and ack times, hardware H.264 encoding on macOS, frames sent as soon as they're encoded
- Cast Screen: mirror the display to DLNA smart TVs and Roku
- AirPlay (macOS) and Miracast (Windows) displays listed with a handoff to system mirroring
- Stop Casting: stop the stream and close the receiver app
- No external dependencies: the screen encoder is downloaded and verified automatically on first use
- Works on macOS and Windows
- Stream is only reachable by the chosen Cast device (interface-bound, random port, per-session token)
- Updated all dependencies (Raycast API 2.x)
