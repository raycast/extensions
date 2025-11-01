# Error Handling Implementation

## Overview

The extension now features comprehensive user-friendly error handling that translates technical errors into clear, actionable messages for users.

## Architecture

### Centralized Error Handling Utility

**Location**: `src/utils/errorHandling.ts`

The utility provides:

1. **Error Classification**: Automatically categorizes errors into specific types
2. **User-Friendly Messages**: Maps technical errors to clear, non-technical language
3. **Contextual Error Display**: Shows errors with appropriate context about what action failed
4. **Debug Logging**: Preserves technical details in console for debugging

### Error Types

The system recognizes and handles these error categories:

- **API_KEY_MISSING**: API key not configured
- **API_KEY_INVALID**: Invalid or unauthorized API key
- **RATE_LIMIT**: Too many requests to the API
- **NETWORK**: Connection issues or server unavailable
- **NOT_FOUND**: Resource doesn't exist
- **PERMISSION**: Access denied
- **FILE_SYSTEM**: File read/write errors
- **VALIDATION**: Invalid data format
- **UNKNOWN**: Unexpected errors

## Implementation

### API Layer

**Files Modified**:
- `src/fathom/api.ts`
- `src/fathom/client.ts`

**Changes**:
- API errors now include error type prefixes (e.g., `API_KEY_MISSING:`, `RATE_LIMIT:`)
- HTTP status codes mapped to user-friendly messages
- Rate limiting errors provide clear guidance to wait and retry

**Example**:
```typescript
// Before
throw new Error("Invalid API Key. Please check your Fathom API Key in Extension Preferences.");

// After
throw new Error("API_KEY_INVALID: Invalid API Key. Please check your Fathom API Key in Extension Preferences.");
```

### Action Files

**Files Modified**:
- `src/actions/TeamMemberActions.tsx`
- `src/actions/TeamActions.tsx`

**Changes**:
- Replaced raw error messages with `showContextualError()`
- Provides action context (e.g., "export member details", "open meetings")

**Example**:
```typescript
// Before
catch (error) {
  await showToast({
    style: Toast.Style.Failure,
    title: "Export Failed",
    message: error instanceof Error ? error.message : String(error),
  });
}

// After
catch (error) {
  await showContextualError(error, {
    action: "export member details",
    fallbackTitle: "Export Failed",
  });
}
```

### Export Utilities

**File Modified**: `src/utils/export.ts`

**Changes**:
- Export operations now show user-friendly error messages
- File system errors are properly classified

### Cache Manager

**File Modified**: `src/utils/cacheManager.ts`

**Changes**:
- Cache refresh errors display helpful messages
- Network issues clearly communicated to users

### UI Components

**File Modified**: `src/search-meetings.tsx`

**Changes**:
- Summary and transcript loading errors use `getUserFriendlyError()`
- Error messages are consistent across the UI

## User-Facing Error Messages

### API Key Errors

**Missing API Key**:
- Title: "API Key Required"
- Message: "Please configure your Fathom API Key in Extension Preferences."

**Invalid API Key**:
- Title: "Invalid API Key"
- Message: "Please check your Fathom API Key in Extension Preferences."

### Rate Limiting

- Title: "Too Many Requests"
- Message: "Please wait a moment and try again."

### Network Errors

- Title: "Connection Error"
- Message: "Unable to connect to Fathom. Please check your internet connection."

### File System Errors

- Title: "File System Error"
- Message: "Unable to read or write file. Please check permissions."

### Generic Errors

- Title: "Something Went Wrong"
- Message: "An unexpected error occurred. Please try again."

## API Reference

### `getUserFriendlyError(error: unknown)`

Returns a user-friendly error object with title and message.

```typescript
const { title, message } = getUserFriendlyError(error);
```

### `showErrorToast(error: unknown, customTitle?: string)`

Shows a toast notification with user-friendly error message.

```typescript
await showErrorToast(error);
// or with custom title
await showErrorToast(error, "Custom Title");
```

### `showContextualError(error: unknown, context: {...})`

Shows a contextual error toast with action-specific messaging.

```typescript
await showContextualError(error, {
  action: "export meeting",
  fallbackTitle: "Export Failed",
  fallbackMessage: "Optional custom message for unknown errors"
});
```

### `classifyError(error: unknown)`

Classifies an error into a specific ErrorType.

```typescript
const errorType = classifyError(error);
// Returns: ErrorType.API_KEY_MISSING, ErrorType.NETWORK, etc.
```

## Benefits

1. **Better User Experience**: Users see clear, actionable error messages instead of technical jargon
2. **Consistent Messaging**: All errors follow the same pattern across the extension
3. **Easier Debugging**: Technical details still logged to console for developers
4. **Maintainability**: Centralized error handling makes updates easier
5. **Localization Ready**: Error messages are centralized and can be easily translated

## Testing

To test error handling:

1. **API Key Errors**: Remove or invalidate API key in preferences
2. **Rate Limiting**: Make rapid successive API calls
3. **Network Errors**: Disconnect internet or use invalid API endpoint
4. **File System Errors**: Try exporting to a read-only directory
5. **Not Found Errors**: Request a non-existent meeting ID

## Future Enhancements

Potential improvements:

- Add retry logic with user notification
- Implement error recovery suggestions
- Add telemetry for error tracking
- Support for localized error messages
- Custom error actions (e.g., "Open Preferences" button for API key errors)
