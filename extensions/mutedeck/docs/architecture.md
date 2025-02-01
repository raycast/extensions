# MuteDeck Raycast Extension Architecture

## Overview

The MuteDeck Raycast extension provides quick access to meeting controls through individual commands.
It communicates with MuteDeck's local API (http://localhost:3491) to control microphone, video, and meeting status.

## Core Features

### 1. Meeting Controls

- **Toggle Microphone** (`toggle-microphone`)

  - Quick toggle for microphone mute/unmute
  - Supports custom hotkey binding
  - Toast notifications for status changes
  - Error handling for common cases
  - Bootstrap icon integration
  - Real-time status updates

- **Toggle Video** (`toggle-video`)

  - Quick toggle for camera on/off
  - Supports custom hotkey binding
  - Toast notifications for status changes
  - Error handling for common cases
  - Bootstrap icon integration
  - Real-time status updates

- **Leave Meeting** (`leave-meeting`)

  - Quick command to exit current meeting
  - Confirmation dialog for safety
  - Toast notifications for status
  - Error handling for common cases
  - Bootstrap icon integration
  - Clear visual feedback

- **Status Display** (`show-status`)
  - Real-time meeting state monitoring
  - Visual indicators for all states
  - Auto-refresh with error handling
  - Clear status feedback
  - Bootstrap icon integration
  - Comprehensive state display

## Technical Architecture

### 1. API Integration Layer

- **Base URL**: http://localhost:3491/v1
- **Endpoints**:
  - `GET /status` - Get current states
  - `POST /mute/toggle` - Toggle microphone
  - `POST /video/toggle` - Toggle video
  - `POST /leave` - Leave meeting
- **Error Handling**:
  - Connection timeouts (2 second limit)
  - MuteDeck not running detection
  - Network error handling
  - Clear error messages
  - Graceful degradation

### 2. Command Structure

- **Individual Command Files**:
  ```
  src/
  ├── commands/
  │   ├── toggle-microphone.tsx
  │   ├── toggle-video.tsx
  │   ├── leave-meeting.tsx
  │   └── show-status.tsx
  └── utils/
      └── api.ts
  ```
- **Command Types**:
  - `no-view` for direct actions
  - `view` for status display
- **Error Handling**:
  - Pre-action validation
  - Clear error messages
  - User guidance
  - Recovery options
  - State persistence

### 3. User Interface

- **Status View**:

  - Clean, minimal design
  - Real-time updates
  - Clear visual indicators
  - Keyboard shortcut hints
  - Bootstrap icon integration
  - Consistent visual language

- **Toast Notifications**:
  - Action confirmations
  - Error messages
  - Status updates
  - User guidance
  - Clear visual hierarchy

### 4. Error States

- **MuteDeck Not Running**:

  - Clear error message
  - Startup instructions
  - Status indicator
  - Recovery guidance
  - Visual feedback

- **No Active Meeting**:

  - Status indication
  - Clear messaging
  - Action prevention
  - User guidance
  - Visual state indicators

- **Network Issues**:
  - Connection retry
  - Timeout handling
  - Clear error messages
  - Troubleshooting steps
  - Status persistence

## Development Guidelines

### 1. Code Organization

- Separate command files
- Shared utilities
- Type definitions
- Clear documentation
- Consistent formatting
- ESLint/Prettier integration

### 2. Error Handling

- Pre-action validation
- Clear error messages
- User guidance
- Recovery options
- State management
- Logging

### 3. Testing

- Command functionality
- Error conditions
- Status accuracy
- User feedback
- Visual regression
- Integration tests

### 4. Performance

- Quick command execution
- Efficient status polling
- Minimal UI overhead
- Resource management
- Caching strategies
- State optimization

### 5. Asset Management

- Bootstrap icon integration
- Consistent visual language
- High-quality screenshots
- Professional documentation
- Store assets
- Brand consistency

## Quality Standards

- TypeScript strict mode
- ESLint/Prettier configuration
- Pre-commit hooks

```

```
