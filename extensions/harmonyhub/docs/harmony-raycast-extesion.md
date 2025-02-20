# Harmony Raycast Extension

This extension allows you to control your Logitech Harmony Hub directly from Raycast. Manage devices, execute commands, and control activities without leaving your keyboard.

## Quick Start

1.  **Install Raycast:** Ensure you have [Raycast](https://raycast.com/) installed on your macOS system.
2.  **Install Harmony Control:** Open the Raycast store and search for "Harmony Control". Install the extension.
3.  **Hub Discovery:** The extension automatically discovers Harmony Hubs on your local network. If only one hub is found it will automatically connect.
4. **Control:** Use the `Control Harmony Hub` command in Raycast to access your devices and activities.

## Features

*   🔍 **Automatic Hub Discovery:** Finds Harmony Hubs on your network.
*   📱 **Device Control:** Control all Harmony-connected devices.
*   ⚡️ **Quick Commands:** Access and execute device commands.
*   🎮 **Activity Management:** Start and stop activities.
*   🔄 **Real-time Status:** View the current activity status.
*   ⌨️ **Keyboard Navigation:** Full keyboard support for all actions.

## Configuration

Configure preferences in Raycast settings for the Harmony extension:

*   **Default View:** Choose to show "Activities" or "Devices" by default.
*   **Command Hold Time:** Duration (milliseconds) to hold a command. Increase if commands are not recognized. (Default: 100ms)
*    **Auto Retry**: Enable or disable the automatic retry of failed operations.
*   **Max Retries**: Maximum number of retry attempts.
*   **Debug Mode:** Enable detailed logging for troubleshooting.

### Network Requirements

*   Harmony Hub and computer must be on the same local network.
*   UDP port 5222 must be accessible for hub discovery.
*   TCP port 8088 must be accessible for hub communication.
*   Firewall rules should not block Harmony Hub communication.

## Usage

### Basic Control

1.  Open Raycast.
2.  Type "Control Harmony Hub" and select the command.
3.  If multiple hubs are found, select the desired hub.
4.  Navigate through devices and activities.
5.  Execute commands or start/stop activities.

### Keyboard Shortcuts

*   `⌘ + R`: Refresh hub/device list.
*   `⌘ + [`: Go back to the previous view.
*   `⌘ + Backspace`: Clear the cache.
*   `⌘ + Shift + A`: Switch to Activities view.
*   `⌘ + Shift + D`: Switch to Devices view.

## Troubleshooting
Refer to the troubleshooting section in the `README.md` file for solutions to the most common issues.

## Core Services

### `HarmonyClient`

Communicates with a Harmony Hub.

```typescript
class HarmonyClient {
  constructor(hub: HarmonyHub);
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async getDevices(): Promise<HarmonyDevice[]>;
  async getActivities(): Promise<HarmonyActivity[]>;
  async getCurrentActivity(): Promise<HarmonyActivity | null>;
  async startActivity(activityId: string): Promise<void>;
  async stopActivity(): Promise<void>;
  async executeCommand(command: HarmonyCommand): Promise<void>;
  async clearCache(): Promise<void>;
}
```

### `HarmonyManager`

Discovers and manages Harmony Hubs.

```typescript
class HarmonyManager {
  async startDiscovery(onProgress?: (progress: number, message: string) => void): Promise<HarmonyHub[]>;
  async cleanup(): Promise<void>;
  async clearCache(): Promise<void>;
  async clearAllCaches(): Promise<void>;
}
```
### `ErrorHandler`

Handles errors.

```typescript
class ErrorHandler {
    static configure(config: Partial<ErrorHandlerConfig>): void;
    static handle(error: Error | unknown, context?: string): void;
    static handleWithCategory(error: Error | unknown, category: ErrorCategory, context?: string): void;
    static handleAsync<T>(operation: () => Promise<T>, context?: string): Promise<T>;
    static handleAsyncWithCategory<T>(operation: () => Promise<T>, category: ErrorCategory, context?: string): Promise<T>;
}
```

## Hooks

### `useHarmony`

Main hook for Harmony Hub interaction.

```typescript
function useHarmony(): {
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  currentActivity: HarmonyActivity | null;
  loadingState: LoadingState | null;
  error: HarmonyError | null;
  connect: (hub: HarmonyHub) => Promise<void>;
  refresh: () => Promise<void>;
  executeCommand: (command: HarmonyCommand) => Promise<void>;
  startActivity: (activityId: string): Promise<void>;
  stopActivity: () => Promise<void>;
  clearCache: () => Promise<void>;
};
```

### `useActivityFiltering`

Hook for filtering activities.

```typescript
function useActivityFiltering(): ActivityFilteringResult;
```

### `useCommandExecution`

Hook for executing commands.

```typescript
function useCommandExecution(): CommandExecutionResult
```

## Core Types

### `HarmonyHub`

```typescript
interface HarmonyHub {
  readonly id: string;
  readonly name: string;
  readonly ip: string;
  readonly hubId: string;
  readonly remoteId?: string;
  readonly version?: string;
  readonly port?: string;
  readonly productId?: string;
  readonly protocolVersion?: string;
}
```

### `HarmonyDevice`

```typescript
interface HarmonyDevice {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly commands: ReadonlyArray<HarmonyCommand>;
}
```

### `HarmonyActivity`

```typescript
interface HarmonyActivity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly isCurrent: boolean;
}
```

### `HarmonyCommand`

```typescript
interface HarmonyCommand {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly deviceId: string;
  readonly group?: string;
}
```

## Dependencies

This extension relies on the following external libraries:

*   `@harmonyhub/client-ws`: For WebSocket communication with the Harmony Hub.
*   `@harmonyhub/discover`: For discovering Harmony Hubs on the local network.
*   `@raycast/api`: Provides the Raycast API for building extensions.
*   `zustand`: A small, fast and scalable state-management solution.
*   `immer`: Simplifies handling immutable data structures.

It requires Node.js version 16 or higher.

## Advanced Usage

### Custom Logging

You can adjust the verbosity of logging by changing `minLogLevel` in preferences.  Setting it to `DEBUG` provides detailed information useful for troubleshooting complex issues. Logs can be viewed in the Raycast developer tools.

### Cache Management

The extension caches hub configuration to improve performance.  The cache expires after 24 hours by default. You can adjust `cacheTTL` to clear it. You can manually clear the cache using the `⌘ + Backspace` shortcut or the "Clear Cache" action.

### State Management

The application state is managed using `zustand`. The main store is in `src/stores/harmony.ts`.  The `useHarmony` hook provides access to the state and actions. The View state is managed separately, using `src/stores/view.ts`.
