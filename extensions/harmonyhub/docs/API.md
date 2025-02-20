# Harmony Extension API Documentation

## Core Services

### HarmonyClient

Primary service for communicating with a Harmony Hub.

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

### HarmonyManager

Service for discovering and managing Harmony Hubs.

```typescript
class HarmonyManager {
  async startDiscovery(onProgress?: (progress: number, message: string) => void): Promise<HarmonyHub[]>;
  async cleanup(): Promise<void>;
  async clearCache(): Promise<void>;
  async clearAllCaches(): Promise<void>;
}
```

### ErrorHandler

Centralized error handling service.

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

### useHarmony

Primary hook for Harmony Hub interaction.

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
  startActivity: (activityId: string) => Promise<void>;
  stopActivity: () => Promise<void>;
  clearCache: () => Promise<void>;
};
```

### useActivityFiltering

Hook for filtering and managing activities.

```typescript
function useActivityFiltering(activities: HarmonyActivity[]): {
  filteredActivities: HarmonyActivity[];
  activityGroups: Map<string, HarmonyActivity[]>;
  filterActivities: (query: string) => void;
  getActivityStatus: (activity: HarmonyActivity) => ActivityStatus;
};
```

### useDeviceFiltering

Hook for filtering and managing devices.

```typescript
function useDeviceFiltering(devices: HarmonyDevice[]): {
  filteredDevices: HarmonyDevice[];
  deviceGroups: Map<string, HarmonyDevice[]>;
  filterDevices: (query: string) => void;
  getDeviceCommands: (device: HarmonyDevice) => HarmonyCommand[];
};
```

### useCommandExecution

Hook for executing commands with retry logic.

```typescript
function useCommandExecution(): {
  executeCommand: (command: HarmonyCommand, retryOptions?: RetryOptions) => Promise<void>;
  isExecuting: boolean;
  error: HarmonyError | null;
};
```

## Core Types

### HarmonyHub

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

### HarmonyDevice

```typescript
interface HarmonyDevice {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly commands: ReadonlyArray<HarmonyCommand>;
}
```

### HarmonyActivity

```typescript
interface HarmonyActivity {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly isCurrent: boolean;
}
```

### HarmonyCommand

```typescript
interface HarmonyCommand {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly deviceId: string;
  readonly group?: string;
}
```

## State Management

### View Store

```typescript
interface ViewState {
  currentView: View;
  selectedDevice: HarmonyDevice | null;
  changeView: (view: View) => void;
  selectDevice: (device: HarmonyDevice | null) => void;
}
```

### Harmony Store

```typescript
interface HarmonyState {
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  currentActivity: HarmonyActivity | null;
  loadingState: LoadingState | null;
  error: HarmonyError | null;
}
```

## Usage Examples

### Basic Hub Connection

```typescript
const { hubs, connect } = useHarmony();

// Connect to the first available hub
if (hubs.length > 0) {
  await connect(hubs[0]);
}
```

### Command Execution

```typescript
const { executeCommand } = useCommandExecution();

// Execute a command with retry
await executeCommand(command, {
  maxRetries: 3,
  retryDelay: 1000,
});
```

### Activity Management

```typescript
const { activities, startActivity, stopActivity } = useHarmony();

// Start an activity
const activity = activities.find(a => a.name === "Watch TV");
if (activity) {
  await startActivity(activity.id);
}

// Stop current activity
await stopActivity();
```

### Error Handling

```typescript
try {
  await ErrorHandler.handleAsync(async () => {
    // Your async operation here
  }, "Operation context");
} catch (error) {
  // Error has been properly handled and logged
}
``` 