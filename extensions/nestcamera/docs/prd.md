# Nest Camera Raycast Extension PRD

## Overview
A Raycast extension that provides quick access to Google Nest camera feeds through direct RTSP streaming with FFplay, enabling users to view their camera feeds with minimal interaction. This extension is specifically designed for the Nest Cam Indoor (1st gen) model, which only supports RTSP streaming.

## Problem Statement
Users want quick access to their Nest camera feeds without opening the Google Home app or website. Current solutions require multiple clicks and app switches, making it inefficient for quick camera checks. The Nest Cam Indoor (1st gen) only supports RTSP streaming, requiring a specialized solution for reliable playback.

## Goals
- Provide instant access to Nest camera feeds through direct RTSP streaming with FFplay
- Support authentication with Google Nest/Home using OAuth2 with PKCE
- Enable quick camera switching with intuitive search and filtering
- Support hotkey access to favorite cameras
- Provide reliable stream playback through FFplay's optimized parameters
- Provide clear error feedback and recovery options

## Non-Goals
- Camera configuration/settings management
- Recording/snapshot capabilities
- Multi-camera simultaneous viewing
- Custom video player UI
- Embedded video playback within Raycast
- Cross-platform support (macOS-only)
- WebRTC streaming support (due to technical limitations)

## User Experience

### Authentication Flow
1. First-time setup:
   - OAuth2 authentication with Google using PKCE
   - Secure token storage using Raycast's SecureStorage
   - Automatic token refresh handling
   - Clear error messaging for auth issues

### Camera Selection
1. Main Interface:
   - List available cameras with room/location grouping
   - Search/filter capabilities
   - Online/offline status indicators
   - Quick access to favorite cameras
   - Last used camera memory

2. Camera Actions:
   - Open direct RTSP stream with FFplay
   - Set as favorite for hotkey access
   - One-click stream launch

### Stream Viewing
1. Launch Options:
   - Direct FFplay window with optimized parameters
   - Full-screen capability
   - Low-latency viewing

2. Error Handling:
   - Clear error messages with recovery steps
   - Automatic retry for recoverable errors
   - Manual fallback instructions when needed
   - Network status monitoring
   - FFplay dependency detection and installation guidance

## Technical Requirements

### Authentication
- OAuth2 with PKCE implementation
- Secure token storage using Raycast's SecureStorage
- Automatic token refresh before expiration
- Error recovery for auth failures

### API Integration
- Google Smart Device Management (SDM) API
- RTSP stream URL generation
- FFplay direct streaming
- Process management for stream control
- Robust error handling

### Performance
- Stream initialization < 3 seconds
- Camera list retrieval < 1 second
- Reliable stream playback
- Efficient resource management
- Proper process cleanup

## Success Metrics
1. Time to view (from hotkey to visible stream)
   - Target: < 3 seconds
   - Fallback handling < 5 seconds
2. Authentication reliability
   - Token refresh success rate > 99%
   - Clear error recovery paths
3. Stream stability
   - Successful stream start rate > 95%
   - Recovery from network issues < 3 seconds
4. User interaction time
   - Camera selection to stream < 2 clicks
   - Stream start < 1 click

## Questions & Dependencies

### Dependencies
1. Google Device Access registration ($5 fee)
2. OAuth client setup
3. FFmpeg/FFplay installation
4. macOS permissions for:
   - Process execution
   - Network access

### Technical Constraints
1. Camera Model Support
   - Specifically designed for Nest Cam Indoor (1st gen)
   - Only supports RTSP streaming protocol
   - No support for newer streaming protocols (WebRTC)
2. RTSP stream availability
3. FFplay installation requirement
4. Raycast extension limitations:
   - No embedded video playback
   - No custom UI components
   - Limited to provided APIs

## Timeline
Phase 1: Authentication & Setup (1 week) ✓
- Project structure
- OAuth implementation
- Token management

Phase 2: Camera Management (1 week) ✓
- Camera list retrieval
- UI implementation
- Settings management

Phase 3: RTSP Streaming (2 weeks) ✓
- RTSP URL generation
- Direct FFplay integration
- Process management implementation

Phase 4: Error Handling (1 week) ✓
- Error detection
- Recovery procedures
- User feedback
- FFplay dependency handling

Phase 5: Polish & Testing (1 week) 🚧
- Performance optimization
- Resource management
- Documentation

Phase 6: Distribution (1 week)
- Final testing
- Store submission
- User documentation

## Future Considerations
1. Feature Expansion
   - Support for additional camera brands
   - Enhanced FFplay controls
   - Stream quality presets
   
2. Performance Improvements
   - Faster stream initialization
   - Better error recovery
   - Enhanced streaming reliability

3. Integration Opportunities
   - Additional streaming protocols
   - Advanced automation
   - Custom video player options 