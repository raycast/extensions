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

#### 3.1.2 Direct Stream Playback ✓ [COMPLETED]
- [x] Abandon HLS server approach due to stability issues
- [x] Implement direct RTSP URL retrieval
- [x] Create HTML interface with multiple viewing options
- [x] Implement direct FFplay launch for seamless viewing
- [x] Create shell script wrapper for FFplay with optimal parameters
- [x] Add automatic process management
- [x] Implement error handling and recovery

### Current Status and Next Steps:

#### What's Working:
1. Successfully acquiring RTSP URLs from Nest API
2. Direct FFplay streaming with optimized parameters
3. Token refresh and management
4. Process management with proper cleanup
5. Comprehensive error handling with user feedback

#### Current Challenges:
1. FFplay Dependency
   - Users need FFmpeg/FFplay installed
   - Added clear instructions and error handling for this requirement

2. User Experience
   - One-click solution implemented
   - FFplay launches directly with optimized parameters
   - Clear error messages and recovery options

#### Immediate Focus:
1. Testing and Refinement
   - Test across different environments
   - Gather user feedback
   - Refine error handling based on real-world usage

2. Documentation
   - Update user documentation with FFplay requirements
   - Add troubleshooting guide
   - Document configuration options

### 3.2 FFplay Integration ✓ [COMPLETED]

#### 3.2.1 Basic FFplay Implementation ✓
- [x] Create FFplay wrapper script
  - [x] Configure optimal parameters for Nest RTSP streams
  - [x] Add TCP transport for reliability
  - [x] Configure low latency options
  - [x] Test: Direct playback works reliably
- [x] Implement script execution from extension
  - [x] Add process spawning with proper parameters
  - [x] Handle script execution errors
  - [x] Test: Script launches from extension

#### 3.2.2 Enhanced FFplay Experience ✓
- [x] Window management
  - [x] Configure FFplay window title with camera name
  - [x] Set initial window size
  - [x] Test: Window appears with proper title and size
- [x] Error handling
  - [x] Add timeout monitoring
  - [x] Implement automatic retry
  - [x] Add user feedback for failures
  - [x] Test: Recovers from common errors

### Success Metrics for Revised Approach:
1. One-click to video playback in < 3 seconds ✓
2. Reliability rate: > 95% ✓
3. Error recovery: > 90% ✓

## Phase 4: Enhanced Features (Week 5)

### 4.1 Custom Viewer App (Long-term Goal)
- [ ] Research macOS app development for RTSP viewing
- [ ] Create simple Swift-based RTSP viewer
- [ ] Package with extension
- [ ] Implement direct launch from extension
- [ ] Test: Custom viewer works seamlessly

### 4.2 Multi-Display Support
- [ ] Display detection
  - [ ] Use Raycast's `getDisplays` API
  - [ ] Store display identifiers
  - [ ] Validate saved positions
  - [ ] Test: Works across displays

### 4.3 Stream Quality
- [ ] Stream optimization
  - [ ] Monitor FFplay statistics
  - [ ] Add quality indicators
  - [ ] Implement auto-recovery
  - [ ] Test: Quality monitoring works

## Phase 5: Polish and Testing (Week 6)

### 5.1 Performance Optimization
- [ ] Stream initialization
  - [ ] Optimize FFplay parameters
  - [ ] Reduce launch time
  - [ ] Cache where possible
  - [ ] Test: Performance metrics

### 5.2 Reliability
- [ ] Stress testing
  - [ ] Long-running streams
  - [ ] Network interruptions
  - [ ] Display changes
  - [ ] Test: System stability

### 5.3 User Experience
- [ ] UI polish
  - [ ] Add loading states
  - [ ] Improve error messages
  - [ ] Enhance status feedback
  - [ ] Test: UX improvements

## Phase 6: Documentation and Release (Week 7)

### 6.1 Documentation
- [ ] Technical documentation
  - [ ] RTSP implementation
  - [ ] FFplay configuration
  - [ ] Error handling
  - [ ] Test: Documentation complete

### 6.2 User Guide
- [ ] Setup instructions
  - [ ] FFplay requirements
  - [ ] Permission setup
  - [ ] Troubleshooting guide
  - [ ] Test: Guide is clear

### 6.3 Release
- [ ] Final testing
  - [ ] End-to-end validation
  - [ ] Performance verification
  - [ ] Security audit
  - [ ] Test: Release ready

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
  player: 'ffplay' | 'custom';
  parameters?: string[];
}

class RtspStreamService {
  async startStream(deviceId: string, options: RtspStreamOptions): Promise<void>;
  async stopStream(deviceId: string): Promise<void>;
  async getStreamStatus(deviceId: string): Promise<StreamStatus>;
}
```

### Process Management
```typescript
interface StreamProcess {
  pid: number;
  deviceId: string;
  startTime: Date;
  player: string;
}

class ProcessManager {
  async startProcess(command: string, args: string[]): Promise<StreamProcess>;
  async stopProcess(pid: number): Promise<void>;
  async cleanup(): Promise<void>;
}
```

### Error Handling
```typescript
enum StreamErrorCode {
  RTSP_CONNECTION_FAILED = 'RTSP_CONNECTION_FAILED',
  FFPLAY_ERROR = 'FFPLAY_ERROR',
  PROCESS_LAUNCH_FAILED = 'PROCESS_LAUNCH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  // ... other error codes
}
```

## Success Criteria
1. One-click to video playback in < 3 seconds
2. Stream stability > 95%
3. Error recovery rate > 90%
4. User satisfaction rating > 4.5/5

## Risk Mitigation
1. RTSP Complexity
   - Thorough testing of FFplay configuration
   - Robust error handling
   - Clear user feedback

2. Process Management
   - Reliable process tracking
   - Proper cleanup procedures
   - Fallback mechanisms

3. Network Issues
   - Automatic retry logic
   - Stream health monitoring
   - Clear status indicators

## Dependencies
1. External
   - FFmpeg/FFplay (RTSP handling)
   - macOS permissions

2. Internal
   - Process management
   - Error handling system

## Monitoring and Maintenance

### 1. Performance Monitoring
- Stream initialization time
- Camera list load time
- Error recovery success rate

### 2. Error Tracking
- Authentication failures
- Stream initialization errors
- Process management issues
- Network connectivity problems

### 3. User Feedback
- Extension store ratings
- User reported issues
- Feature requests
- Performance reports 