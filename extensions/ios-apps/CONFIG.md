# Configuration Module

This document describes the configuration module (`src/config.ts`) that provides access to user preferences and default values for the iOS Apps extension.

## Overview

The configuration module exposes five main settings:

- **maxDownloadTimeout** (ms) - Timeout for individual downloads
- **maxStallTimeout** (ms) - Timeout when no progress is made  
- **tempCleanupOnExit** (bool) - Whether to clean up temporary files on exit
- **integrityVerification** (enum) - Level of file integrity verification (`basic` | `checksum` | `off`)
- **allowedScreenshotDomains** (string[]) - Whitelist of domains allowed for screenshot downloads (defaults include Apple CDN hosts; additional domains can be appended via preferences)

## Default Values

All defaults live in code except for `downloadTimeoutSeconds`:

```typescript
const defaultConfig: Config = {
  maxDownloadTimeout: 90000, // 90 seconds in milliseconds
  maxStallTimeout: 30000,    // 30 seconds in milliseconds  
  tempCleanupOnExit: true,
  integrityVerification: "basic",
};
```

Note: `maxDownloadTimeout` is derived from the existing `downloadTimeoutSeconds` preference, converted to milliseconds.

## Usage

### Get All Configuration Values

```typescript
import { getConfig } from "./config";

const config = getConfig();
console.log(config.maxDownloadTimeout); // 90000
console.log(config.maxStallTimeout);    // 30000
console.log(config.tempCleanupOnExit);  // true
console.log(config.integrityVerification); // "basic"
```

### Get Individual Configuration Values

```typescript
import { getConfigValue } from "./config";

const downloadTimeout = getConfigValue("maxDownloadTimeout");
const shouldCleanup = getConfigValue("tempCleanupOnExit");
```

### Log Current Configuration (for debugging)

```typescript
import { logCurrentConfig } from "./config";

logCurrentConfig();
// Outputs:
// [Config] Current configuration: {
//   maxDownloadTimeout: "90000ms (90s)",
//   maxStallTimeout: "30000ms (30s)", 
//   tempCleanupOnExit: true,
//   integrityVerification: "basic"
// }
```

## Preferences Integration

The configuration module reads from Raycast preferences defined in `package.json`:

```json
{
  "name": "downloadTimeoutSeconds",
  "title": "Download Timeout (in seconds)",
  "type": "textfield",
  "default": "90"
},
{
  "name": "maxStallTimeout", 
  "title": "Max Stall Timeout (in milliseconds)",
  "type": "textfield",
  "default": "30000"
},
{
  "name": "tempCleanupOnExit",
  "title": "Cleanup Temporary Files",
  "type": "checkbox", 
  "default": true
},
{
  "name": "integrityVerification",
  "title": "Integrity Verification",
  "type": "dropdown",
  "data": [
    {"title": "Basic", "value": "basic"},
    {"title": "Checksum", "value": "checksum"}, 
    {"title": "Off", "value": "off"}
  ],
  "default": "basic"
}
```

## Error Handling

The configuration module includes error handling:

- If preferences cannot be read, it falls back to default values
- Invalid numeric values are validated with minimum bounds
- Errors are logged via the logger utility

## Type Safety

The module exports TypeScript types for type-safe usage:

```typescript
import { Config, IntegrityVerification } from "./config";

// Config interface provides type safety for all settings
function useConfig(): Config {
  return getConfig();
}

// IntegrityVerification type for verification level
function setVerification(level: IntegrityVerification) {
  // level is constrained to "basic" | "checksum" | "off"
}
```

## Example Usage

See `src/utils/config-example.ts` for comprehensive usage examples including:

- Download functions with timeout handling
- Integrity verification based on config
- Cleanup logic based on preferences
- React hook-style usage patterns
