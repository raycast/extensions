# Harmony Raycast Extension: Technical Architecture

This document provides a technical overview of the Harmony Raycast Extension's architecture and design. It covers the project's structure, key modules, and the relationships between them, helping anyone—including large language models—quickly understand how the application works.

## Overview

The Harmony Raycast Extension integrates with Logitech Harmony Hubs to:
* Discover Harmony Hubs on a local network
* Connect to a selected hub
* Retrieve and display devices and activities
* Send commands (e.g., power, volume) to devices
* Start/stop activities on the hub

It uses React (and React hooks) to manage the UI within Raycast, and it organizes functionality into logical layers:
1. UI Components: React-based screens and lists displayed in Raycast
2. Business Logic Hooks: Custom hooks (notably useHarmony) for hub discovery, connection, caching, and error handling
3. Services: Classes and modules that handle Harmony Hub networking, caching, logging, secure storage, and session management
4. Types: A set of TypeScript interfaces, enums, and error classes describing domain objects and categorizing errors

## Project Structure

Below is a high-level breakdown of the key directories and files:

```
/assets
├── command-icon.png
└── extension-icon.png

/docs
/metadata
├── harmony-control-1.png
├── harmony-control-2.png
├── harmony-control-3.png
└── harmony-control-4.png

/src
├── components
├── features
├── hooks
├── services
├── types
├── ui
├── utils
└── control.tsx

.eslintrc.json
.Plan
.prettierrc
package.json
README.md
tsconfig.json
```

### /assets
Contains image assets such as icons displayed in Raycast.

### /docs and /metadata
* `/docs`: Placeholder for documentation files (if any)
* `/metadata`: Contains image files used in readme-like metadata or for visual references in the extension

### /src
The main source directory containing all logic, UI components, and service files. The key subfolders are:

#### 1. /components
Reusable React components. Notable files:
* `DeviceList.tsx`: Renders a searchable list of devices and their commands. Uses useHarmony to fetch device data, filter commands, and send commands
* `FeedbackState.tsx`: A UI component for displaying loading states, error states, or empty states. It also includes predefined states for loading and errors
* `ErrorBoundary.tsx`: Standard React error boundary component to catch and display errors gracefully
* `HarmonyCommand.tsx`: A core component providing a unified interface for controlling devices and activities. It sets up various views (hubs list, devices list, activities list) with searching and filtering

#### 2. /features/control
Specialized domain logic for controlling the Harmony Hub (types, etc.):
* `types/harmony.ts`: Domain-specific types for hubs, devices, commands, and activities

#### 3. /hooks
Contains custom React hooks, most notably:
* `useHarmony.ts`: Central hook managing discovery, connection, state, and commands for the Harmony Hubs. Internally uses a singleton HarmonyManager and HarmonyClient to handle lower-level interactions

#### 4. /services
Encapsulates core business logic that sits apart from React components. Key files:
* `harmony/harmonyManager.ts`: Orchestrates discovery of Harmony Hubs on the local network, caching results, and providing a centralized manager for discovered hubs
* `harmony/harmonyClient.ts`: A client for interacting with a specific Harmony Hub (fetching devices/activities, sending commands, etc.)
* `harmony/commandQueue.ts`: Queues and processes commands for concurrency control and retries
* `harmony/harmonyMachine.ts`: An XState-based state machine for transitions related to discovery and connection
* `harmony/harmonyWebSocket.ts`: WebSocket-based approach for direct network control
* `harmony/harmonyState.ts`: Defines constants and interfaces for describing loading stages
* `errorHandler.ts`: Provides a standard way to handle and display errors
* `localStorage.ts`: A thin wrapper around Raycast's local storage API with logging
* `logger.ts`: Central logging mechanism that writes logs to the console or keeps them in memory
* `secure-storage.ts`: Example of encrypted storage usage with Raycast's local storage
* `session-manager.ts`: Manages session tokens, expiration, and cache clearing

#### 5. /types
A set of TypeScript definitions for core concepts, logging, errors, and preferences. Notable files:
* `errors.ts`: Defines the HarmonyError class, error categories, severities, and potential recovery actions
* `harmony.ts`: Describes domain objects like HarmonyHub, HarmonyDevice, HarmonyCommand, HarmonyActivity, and the HarmonyStage enum
* `logging.ts`: Log levels, interfaces, and structures for the logging system
* `preferences.ts`: Interface for user preferences (e.g., default view, command hold time, etc.)
* `websocket.ts`: Types for WebSocket-based message structures, commands, and responses

#### 6. /ui
* `toast-manager.ts`: A small helper class that wraps Raycast showToast calls for consistent success/error/loading toasts

#### 7. /utils
* `validation.ts`: Validation utilities for checking hub IPs, device properties, command requests, and retry configurations

#### 8. control.tsx
The main entry point for the extension's command. It wraps the HarmonyCommand component with the HarmonyProvider, thereby setting up the context and hooking everything together.

## Flow of the Application

### 1. Startup & Discovery
* When the extension is opened, `control.tsx` loads the HarmonyProvider (from hooks/useHarmony)
* HarmonyProvider automatically starts discovering Harmony Hubs via `HarmonyManager.startDiscovery`

### 2. Selecting a Hub
* The user sees a list of available hubs (HarmonyCommand shows the "hubs" view)
* Selecting a hub triggers `connect(hub)` in useHarmony, creating a HarmonyClient to load devices, activities, and the current activity

### 3. Browsing Devices and Activities
* Users can switch between "Devices" and "Activities" via dropdown in the Raycast UI, or they can filter commands directly
* Devices (and their commands) come from `getDevices()`. Activities come from `getActivities()`

### 4. Sending Commands or Starting Activities
* The DeviceList or HarmonyCommand will call `executeCommand()` or `startActivity()`/`stopActivity()` from useHarmony
* This is relayed to HarmonyClient which sends the appropriate commands to the Harmony Hub over a websocket or direct protocol

### 5. Error Handling
* If an error occurs at any point (discovery, connection, command execution), a HarmonyError is thrown
* The UI displays error states via `FeedbackState.tsx`. The `ErrorBoundary.tsx` also catches unhandled component errors

### 6. Caching & Logging
* `harmonyManager.ts` caches discovered hubs to speed up subsequent loads
* `harmonyClient.ts` may cache devices/activities to reduce repeated network calls
* The Logger writes debug information based on user preferences (e.g., debugLogging)

## Key Components and Hooks

### 1. DeviceList.tsx
* Accepts optional filters (e.g., a single deviceType) and shows matching devices in a Raycast list
* Uses `executeCommand()` to trigger commands on item selection

### 2. HarmonyCommand.tsx
* A comprehensive UI for controlling hubs, devices, and activities in a single list-based interface
* Organizes multiple views: Hubs, Activities, Devices, or Commands (when user toggles the dropdown)
* Performs searching and filtering, then calls `executeCommand`, `startActivity`, `stopActivity`, or `connect`

### 3. FeedbackState.tsx
* A common UI for loading messages, empty states, and error states
* Includes ready-to-use states like `LOADING_DEVICES` or `GENERAL_ERROR`

### 4. useHarmony.ts
The main hook providing the "HarmonyContext" to the entire UI. Manages:
* Discovery (via HarmonyManager)
* Connection (via HarmonyClient)
* State (devices, activities, current activity)
* Commands (execute a command, start/stop an activity)
* Handles errors and loading states, exposing error and loadingState

### 5. ErrorBoundary.tsx
* Catches runtime errors in child components, logging them and rendering a fallback FeedbackState

## Services and Architecture

### 1. Harmony Management

#### HarmonyManager
* Discovers hubs using @harmonyhub/discover, caches results, and has logic to handle timeouts
* Provides an interface to clear caches and re-discover

#### HarmonyClient
* Connects to a chosen hub, fetching devices/activities
* Sends commands to the hub, handling logic such as "hold" and "release" for IR-based commands
* Maintains a local cache for devices/activities to reduce repeated lookups

#### commandQueue.ts
* Can queue commands to manage concurrency and retries

### 2. State Machines and WebSocket
* `harmonyMachine.ts`: An XState-based finite state machine that defines states like DISCOVERING, CONNECTING, CONNECTED, etc.
* `harmonyWebSocket.ts`: A lower-level approach to managing direct WebSocket communication with the hub

### 3. Error Handling and Logging
* `errorHandler.ts`: Central logic to convert generic errors into HarmonyError objects and optionally show Raycast toasts
* `logger.ts`: Manages log levels (DEBUG, INFO, WARN, ERROR) with in-memory or console output
* `localStorage.ts`: Thin abstraction over Raycast LocalStorage with error logging
* `secure-storage.ts`: Demonstrates encryption of stored data using crypto

### 4. Session Management
* `session-manager.ts`: Manages user sessions for local operation with the Harmony Hub

## Types & Data Modeling

The application defines a consistent domain model across all services:
* `HarmonyHub`: A discovered hub with an ip, name, hubId, remoteId, etc.
* `HarmonyDevice`: A device on the hub, containing a list of HarmonyCommands
* `HarmonyActivity`: Represents an activity with an id, name, and isCurrent status
* `HarmonyCommand`: Identifies a command (like volumeUp) with fields for id, name, label, and group

Error handling uses `HarmonyError` (in `errors.ts`), which includes:
* `category` (e.g., CONNECTION, COMMAND_EXECUTION)
* `severity`
* `recoveryStrategies` (possible user or automatic actions)

There are also enumerations like `HarmonyStage` (describing the extension's states: DISCOVERING, CONNECTING, CONNECTED, etc.) and `LogLevel` for logging.

## Putting It All Together

### 1. Raycast Command Entry Point
* `control.tsx` is the root command file
* It wraps everything in a `HarmonyProvider` (from `useHarmony`), which initializes the hub discovery and sets up the context

### 2. Hub Discovery & Selection
* Automatically fetches previously cached hubs or triggers new discovery
* Lists them for user selection in a Raycast list

### 3. Connected State
* Once connected, the extension loads devices and activities. Users can browse them and issue commands

### 4. Commands & Activities
* The UI (especially `HarmonyCommand.tsx` and `DeviceList.tsx`) references `useHarmony` methods to send commands or switch activities

### 5. Error and Loading States
* If errors arise, the `FeedbackState` and `ErrorBoundary` handle user-facing messages. Logging captures them for debugging

## Additional Notes

* Styling: Raycast's API provides the user interface elements (lists, actions, toasts) rather than a custom styling approach
* Caching: The application uses a combination of local storage for caching discovered hubs and the HarmonyClient cache for device/activity configurations
* Testing: While not shown, many of these services and hooks could be tested independently of Raycast's UI using standard React testing or pure TypeScript tests

## Conclusion

The Harmony Raycast Extension is a React/TypeScript application structured into clear domain-driven modules. Its key hooks (`useHarmony`), services (`HarmonyManager`, `HarmonyClient`), and UI components (`HarmonyCommand`, `DeviceList`, etc.) offer a coherent flow: from discovering Harmony Hubs, establishing a connection, and rendering device/activity data, to sending commands and handling errors. This layout provides a solid foundation for extending or customizing the extension's capabilities.