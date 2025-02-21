# Implementation Plan: Nest Camera Raycast Extension

## Target Device
This implementation specifically targets the Nest Cam Indoor (1st generation) which only supports RTSP streaming. The implementation plan is tailored to handle the unique requirements and limitations of this camera model.

## Phase 1: Project Setup and Authentication (Week 1) ✓

### 1.1 Project Initialization ✓
- [x] Create project structure using Raycast extension template
- [x] Set up TypeScript configuration
- [x] Initialize Git repository
- [x] Create initial README.md with setup instructions
- [x] Add basic extension manifest
- [x] Create placeholder commands
- [x] Test: `npm run dev` shows extension with empty camera list

### 1.2 Authentication Module ✓
- [x] Create OAuth types and interfaces
- [x] Implement basic OAuth2 client with PKCE
- [x] Create secure token storage using Raycast's SecureStorage
- [x] Test: `npm run dev` shows Google login flow
- [x] Add token refresh mechanism
- [x] Add token expiration monitoring
- [x] Add authentication error handling
- [x] Test: `npm run dev` maintains login state between sessions

### 1.3 Project Configuration ✓
- [x] Set up Google Device Access project
- [x] Configure OAuth credentials in Raycast preferences
- [x] Test: `npm run dev` shows configured project details
- [x] Add environment variable validation
- [x] Add configuration error handling
- [x] Test: `npm run dev` validates and shows configuration status

## Phase 2: Camera Management (Week 2) ✓

### 2.1 Basic Camera List ✓
- [x] Create camera list types and interfaces
- [x] Add basic camera list UI component
- [x] Implement mock camera data
- [x] Test: `npm run dev` shows list with mock cameras

### 2.2 Device API Integration ✓
- [x] Implement camera list retrieval
- [x] Add camera details fetching
- [x] Test: `npm run dev` shows real cameras from account
- [x] Add camera status monitoring
- [x] Implement error handling for API calls
- [x] Add sign out functionality in command menu
- [x] Test: `npm run dev` shows live camera status

### 2.3 Enhanced Camera List ✓
- [x] Add room-based grouping
- [x] Implement search functionality
- [x] Add online/offline status indicators
- [x] Test: `npm run dev` shows grouped, searchable cameras
- [x] Add favorite camera storage
- [x] Test: `npm run dev` persists favorite selections

## Phase 3: RTSP Streaming Implementation (Week 3-4) 🚧 [CURRENT PHASE]

### 3.1 RTSP Core Implementation ✓

#### 3.1.1 RTSP URL Acquisition ✓
- [x] Implement `NestDeviceService.getRtspStreamUrl`
- [x] Implement SDM API `executeCommand` with `sdm.devices.commands.CameraLiveStream.GenerateRtspStream`
- [x] Add secure token storage using LocalStorage
- [x] Implement proactive token refresh before expiration
- [x] Add comprehensive error handling for API failures

#### 3.1.2 FFmpeg Transcoding Service ✓
- [x] Implement basic FFmpeg command structure
- [x] Configure FFmpeg with TCP transport for RTSP
- [x] Implement process management using `child_process.spawn`
- [x] Add PID tracking and cleanup
- [x] Handle process signals (SIGTERM, SIGINT)
- [x] Debug FFmpeg transcoding issues:
  - [x] Verify FFmpeg output directory permissions
  - [x] Add detailed FFmpeg logging
  - [x] Validate HLS segment generation
  - [x] Test different FFmpeg encoding parameters
  - [x] Monitor segment file creation
- [x] Implement exponential backoff for reconnection

#### 3.1.3 Local HLS Server 🚧 [IN PROGRESS]
- [x] Initial setup with `node-static` server
- [x] Migrate to Fastify for improved stability
- [x] Configure server with security headers
- [x] Implement proper file serving for HLS content
- [x] Add cleanup routines for old segments
- [ ] Debug server stability issues:
  - [x] Fix route conflicts between static and dynamic handlers
  - [ ] Implement proper server shutdown between sessions
  - [ ] Add server state recovery mechanisms
  - [ ] Handle Raycast extension restart scenarios
- [ ] Create HTML player page with HLS.js (optional - using Safari native HLS player)

#### 3.1.4 Stream Management ✓
- [x] Monitor token expiration
- [x] Proactively refresh RTSP URL
- [x] Handle FFmpeg process restart
- [x] Debug stream playback issues:
  - [x] Add FFmpeg progress monitoring
  - [x] Implement stream health checks
  - [x] Add detailed logging for segment generation
  - [x] Create stream diagnostics endpoint
  - [x] Add player error reporting

### Current Status and Next Steps:

#### What's Working:
1. Successfully acquiring RTSP URLs from Nest API
2. FFmpeg transcoding RTSP to HLS format
3. HLS segment generation and management
4. Basic stream playback in Safari
5. Token refresh and stream health monitoring

#### Current Challenges:
1. Server Stability
   - HLS server occasionally fails to restart properly
   - Need better cleanup between Raycast extension restarts
   - Route conflicts in Fastify server being addressed

2. Process Management
   - Ensuring proper cleanup of FFmpeg processes
   - Managing port 8080 availability
   - Handling Raycast extension lifecycle

#### Immediate Focus:
1. Stabilize HLS server
   - Implement proper shutdown procedures
   - Add state recovery mechanisms
   - Improve error handling and logging

2. Improve Process Management
   - Add robust process cleanup
   - Implement proper port management
   - Handle Raycast extension restarts gracefully

3. Testing Strategy
   - Add comprehensive error scenario testing
   - Implement automated cleanup procedures
   - Test extension restart scenarios

### 3.2 Safari Integration ✓
- [x] Basic browser launch
  - [x] Implement `open` with HLS URL
  - [x] Add basic error handling
  - [x] Test: Stream opens in Safari
- [ ] Window positioning (Postponed)
  - [ ] Create `WindowManager` class
  - [ ] Implement position storage/retrieval
  - [ ] Add AppleScript window control
  - [ ] Test: Windows position correctly
- [ ] Picture-in-Picture (Postponed)
  - [ ] Implement PiP AppleScript commands
  - [ ] Add PiP state management
  - [ ] Store PiP preferences
  - [ ] Test: PiP works reliably

### Success Metrics Achieved:
1. RTSP URL acquisition: < 1 second ✓
2. Stream initialization: < 5 seconds ✓
3. Video playback latency: < 10 seconds ✓
4. Stream stability: ~80% (Needs improvement)
5. Error recovery: ~70% (Being enhanced)

## Phase 4: Enhanced Features (Week 5)

### 4.1 Multi-Display Support
- [ ] Display detection
  - Use Raycast's `getDisplays` API
  - Store display identifiers
  - Validate saved positions
  - Test: Works across displays

### 4.2 PiP Enhancements
- [ ] PiP position memory
  - Store PiP window positions
  - Add position restoration
  - Handle display changes
  - Test: PiP positions persist

### 4.3 Stream Quality
- [ ] Stream optimization
  - Monitor FFmpeg statistics
  - Add quality indicators
  - Implement auto-recovery
  - Test: Quality monitoring works

## Phase 5: Polish and Testing (Week 6)

### 5.1 Performance Optimization
- [ ] Stream initialization
  - Optimize FFmpeg parameters
  - Reduce launch time
  - Cache where possible
  - Test: Performance metrics

### 5.2 Reliability
- [ ] Stress testing
  - Long-running streams
  - Network interruptions
  - Display changes
  - Test: System stability

### 5.3 User Experience
- [ ] UI polish
  - Add loading states
  - Improve error messages
  - Enhance status feedback
  - Test: UX improvements

## Phase 6: Documentation and Release (Week 7)

### 6.1 Documentation
- [ ] Technical documentation
  - RTSP implementation
  - FFmpeg configuration
  - Error handling
  - Test: Documentation complete

### 6.2 User Guide
- [ ] Setup instructions
  - FFmpeg requirements
  - Permission setup
  - Troubleshooting guide
  - Test: Guide is clear

### 6.3 Release
- [ ] Final testing
  - End-to-end validation
  - Performance verification
  - Security audit
  - Test: Release ready

## Technical Components

### Device Support
```typescript
interface NestCamera {
  id: string;
  name: string;
  model: "NEST_CAM_INDOOR_GEN1";  // Only supporting 1st gen Indoor
  traits: {
    online: boolean;
    streamingSupport: "RTSP";     // Only RTSP is supported
  };
}
```

### RTSP Implementation
```typescript
interface RtspStreamOptions {
  quality?: 'low' | 'medium' | 'high';
  format: 'hls';
  output: string;
}

class RtspStreamService {
  async startStream(deviceId: string, options: RtspStreamOptions): Promise<string>;
  async stopStream(deviceId: string): Promise<void>;
  async getStreamStatus(deviceId: string): Promise<StreamStatus>;
}
```

### Window Management
```typescript
interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  display: number;
}

class WindowManager {
  async getSavedPosition(cameraId: string): Promise<WindowPosition | null>;
  async savePosition(cameraId: string, position: WindowPosition): Promise<void>;
}
```

### Error Handling
```typescript
enum StreamErrorCode {
  RTSP_CONNECTION_FAILED = 'RTSP_CONNECTION_FAILED',
  FFMPEG_ERROR = 'FFMPEG_ERROR',
  HLS_SERVER_ERROR = 'HLS_SERVER_ERROR',
  BROWSER_COMPATIBILITY = 'BROWSER_COMPATIBILITY',
  // ... other error codes
}
```

## Success Criteria
1. RTSP streams initialize in < 5 seconds
2. Stream stability > 95%
3. Window positioning accuracy > 99%
4. PiP mode success rate > 95%
5. Error recovery rate > 90%

## Risk Mitigation
1. RTSP Complexity
   - Thorough testing of FFmpeg configuration
   - Robust error handling
   - Clear user feedback

2. Browser Integration
   - Reliable AppleScript execution
   - Timeout handling
   - Fallback mechanisms

3. Network Issues
   - Automatic retry logic
   - Stream health monitoring
   - Clear status indicators

## Dependencies
1. External
   - FFmpeg (RTSP handling)
   - Safari (HLS playback)
   - macOS permissions

2. Internal
   - Stream management
   - Window position storage
   - Error handling system

## Monitoring and Maintenance

### 1. Performance Monitoring
- Stream initialization time
- Camera list load time
- Window management operations
- Error recovery success rate

### 2. Error Tracking
- Authentication failures
- Stream initialization errors
- Window management issues
- PiP mode failures

### 3. User Feedback
- Extension store ratings
- User reported issues
- Feature requests
- Performance reports 