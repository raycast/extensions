# Legacy VLC Implementation

This directory contains the original VLC-based implementation for streaming Nest camera feeds. This code has been preserved for reference and potential future use.

## Why Preserved
The VLC implementation was our initial approach for viewing Nest camera feeds. While functional, it had stability issues with RTSP streaming and required complex proxy setup. We've moved to a WebRTC-based approach for better reliability and performance.

## Components
- `NestDeviceService.ts`: Contains VLC streaming logic
- `StreamHandler.ts`: Stream management and error handling
- `RtspProxy.ts`: RTSP proxy server implementation
- `VlcManager.ts`: VLC process management
- `fetch_and_restart.sh`: Shell script for stream relay

## Dependencies
- VLC Media Player
- ffmpeg
- rtsp-simple-server (MediaMTX)

## Known Issues
1. VLC command line arguments needed tuning:
   - Caching values for stability (300ms network/live caching)
   - RTSP over TCP requirements
   
2. RTSP proxy relay stability:
   - Complex ffmpeg relay setup
   - Required retry logic and cleanup
   - Process management challenges

## Migration
This implementation has been replaced with a WebRTC-based solution that:
- Uses browser's native WebRTC capabilities
- Eliminates need for external dependencies
- Provides better stability and performance
- Aligns with Google's preferred streaming approach

## Date Archived
[Current Date] 