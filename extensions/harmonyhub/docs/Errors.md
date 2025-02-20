# Error Handling Documentation

## Error Categories

The extension uses a categorized error system to provide consistent error handling and recovery strategies.

### Connection Errors
- **Category:** `ErrorCategory.CONNECTION`
- **Description:** Issues with initial hub connection
- **Common Causes:**
  - Hub not found on network
  - Network connectivity issues
  - Firewall blocking connection
- **Recovery Actions:**
  - Retry connection
  - Check network settings
  - Verify hub is powered on
  - Check firewall settings

### Hub Communication Errors
- **Category:** `ErrorCategory.HUB_COMMUNICATION`
- **Description:** Issues during hub communication
- **Common Causes:**
  - Network interruption
  - Hub became unresponsive
  - Command timeout
- **Recovery Actions:**
  - Retry operation
  - Reconnect to hub
  - Check network stability
  - Restart hub if persistent

### Command Execution Errors
- **Category:** `ErrorCategory.COMMAND_EXECUTION`
- **Description:** Issues executing device commands
- **Common Causes:**
  - Device not responding
  - Invalid command
  - Hub busy with another command
- **Recovery Actions:**
  - Retry command
  - Verify device is powered on
  - Check command validity
  - Wait and retry

### State Errors
- **Category:** `ErrorCategory.STATE`
- **Description:** Issues with application state
- **Common Causes:**
  - Invalid state transition
  - Missing required state
  - State corruption
- **Recovery Actions:**
  - Reset configuration
  - Clear cache
  - Reinitialize state
  - Restart extension

### Validation Errors
- **Category:** `ErrorCategory.VALIDATION`
- **Description:** Data validation failures
- **Common Causes:**
  - Invalid configuration
  - Malformed data from hub
  - Type mismatches
- **Recovery Actions:**
  - Verify data format
  - Reset to defaults
  - Clear cache and refresh

### Storage Errors
- **Category:** `ErrorCategory.STORAGE`
- **Description:** Local storage issues
- **Common Causes:**
  - Storage full
  - Permission issues
  - Corrupted data
- **Recovery Actions:**
  - Clear old data
  - Reset storage
  - Verify permissions

### Cache Errors
- **Category:** `ErrorCategory.CACHE`
- **Description:** Cache-related issues
- **Common Causes:**
  - Cache corruption
  - Outdated cache
  - Cache size limits
- **Recovery Actions:**
  - Clear cache
  - Refresh data
  - Adjust cache settings

## Error Recovery Strategies

### Automatic Recovery
The extension implements automatic recovery for common errors:

```typescript
class ErrorHandler {
  static async handleAsync<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Automatic error handling and recovery
      ErrorHandler.handle(error, context);
      throw error;
    }
  }
}
```

### Retry Logic
Commands and operations support configurable retry logic:

```typescript
interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: HarmonyError) => boolean;
}

// Example usage
await executeCommand(command, {
  maxRetries: 3,
  retryDelay: 1000,
  shouldRetry: (error) => error.category === ErrorCategory.COMMAND_EXECUTION
});
```

## Error Codes and Messages

### Format
Error codes follow the format: `[CATEGORY]-[SUBCATEGORY]-[NUMBER]`

Example: `CONN-NET-001` for network connection errors

### Common Error Codes

#### Connection (CONN)
- `CONN-NET-001`: Network connectivity issue
- `CONN-HUB-001`: Hub not found
- `CONN-FW-001`: Firewall blocking connection

#### Command (CMD)
- `CMD-EXE-001`: Command execution failed
- `CMD-DEV-001`: Device not responding
- `CMD-VAL-001`: Invalid command format

#### Activity (ACT)
- `ACT-START-001`: Activity start failed
- `ACT-STOP-001`: Activity stop failed
- `ACT-STATE-001`: Invalid activity state

## User-Friendly Error Messages

### Message Guidelines
1. Clear and concise
2. Action-oriented
3. Technical details in logs only
4. Recovery steps included

### Example Messages
```typescript
// Good
"Unable to connect to hub. Please check if the hub is powered on and connected to your network."

// Better
"Connection to 'Living Room Hub' failed. Check network connection and try again. (CONN-NET-001)"

// Best
"Cannot connect to 'Living Room Hub'. Verify the hub is powered on and connected to your WiFi network. Click 'Retry' to attempt reconnection or 'Help' for troubleshooting steps. (CONN-NET-001)"
```

## Error Logging

### Log Levels
- `ERROR`: Serious issues requiring immediate attention
- `WARN`: Potential issues that don't stop operation
- `INFO`: Important state changes and operations
- `DEBUG`: Detailed debugging information

### Log Format
```typescript
{
  timestamp: string;
  level: LogLevel;
  category: ErrorCategory;
  code: string;
  message: string;
  context?: string;
  details?: unknown;
}
```

### Example Log Usage
```typescript
Logger.error("Command execution failed", {
  command: command.name,
  deviceId: command.deviceId,
  error: error.message,
  code: "CMD-EXE-001",
  context: "Volume Up command on TV"
});
```

## Troubleshooting Steps

### For Developers
1. Enable debug logging
2. Check error category and code
3. Review error context and details
4. Verify recovery action results
5. Check network conditions
6. Verify hub firmware version
7. Test with minimal configuration

### For Users
1. Follow error message instructions
2. Try suggested recovery actions
3. Check basic requirements
4. Clear cache if suggested
5. Contact support with error details

## Error Prevention

### Best Practices
1. Validate input data
2. Check preconditions
3. Use type guards
4. Implement proper cleanup
5. Handle edge cases
6. Log state transitions
7. Monitor performance metrics

### Example Prevention
```typescript
// Input validation
if (!isValidCommand(command)) {
  throw new HarmonyError(
    "Invalid command format",
    ErrorCategory.VALIDATION,
    new Error(`Command validation failed: ${JSON.stringify(command)}`)
  );
}

// Precondition checking
if (!this.isConnected) {
  throw new HarmonyError(
    "Must be connected to hub before executing commands",
    ErrorCategory.STATE
  );
}
``` 