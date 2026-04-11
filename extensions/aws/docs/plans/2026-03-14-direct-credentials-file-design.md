# Direct Credentials File Support

**Date:** 2026-03-14
**Status:** Approved

## Summary

Add support for reading AWS credentials directly from a JSON file (`~/.aws/raycast-credentials.json`), enabling users to use temporary session credentials without manual entry in extension preferences.

## Requirements

- **File path:** Fixed at `~/.aws/raycast-credentials.json`
- **Format:** AWS CLI format (compatible with `aws configure export-credentials --format json`)
- **Behavior:** File credentials take priority, silent fallback to profiles/AWS Vault if missing/invalid
- **Errors:** Silent fallback, no notifications

## File Format

```json
{
  "AccessKeyId": "AKIA...",
  "SecretAccessKey": "...",
  "SessionToken": "...",
  "Region": "us-east-1"
}
```

Required fields: `AccessKeyId`, `SecretAccessKey`
Optional fields: `SessionToken`, `Region`

## Architecture

### Approach: Custom Hook

Create a `useDirectCredentials()` hook using Raycast's `useCachedPromise` for efficient file reading.

### Files Changed

**New file:** `src/hooks/use-direct-credentials.ts`
- Hook that reads credentials from `~/.aws/raycast-credentials.json`
- Uses `useCachedPromise` for caching
- Returns `{ credentials, isLoading }` or `null` on error

**Modified:** `src/components/searchbar/aws-profile-dropdown.tsx`
- Import and call `useDirectCredentials()` at the top
- If valid credentials exist, inject into `process.env` before profile logic
- Existing profile/AWS Vault logic remains as fallback

**Modified:** `src/util/index.ts`
- Update `isReadyToFetch()` to check for `AWS_ACCESS_KEY_ID`

## Data Flow

```
AWSProfileDropdown mounts
         │
         ▼
useDirectCredentials() executes
  • Reads ~/.aws/raycast-credentials.json
  • Caches result via useCachedPromise
         │
    ┌────┴────┐
    ▼         ▼
 Valid     Missing/Invalid
    │         │
    ▼         ▼
Set env    Fall back to
vars       profiles/AWS Vault
    │         │
    └────┬────┘
         ▼
isReadyToFetch() returns true
AWS SDK uses credentials from env
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| File doesn't exist | Silent fallback to profiles |
| Invalid JSON | Silent fallback to profiles |
| Missing required fields | Silent fallback to profiles |
| Read permission denied | Silent fallback to profiles |
| Expired credentials | AWS API error displays to user (existing behavior) |

## Testing

1. **File exists with valid credentials** - Resources load successfully
2. **File missing** - Falls back to profile selection
3. **Invalid JSON** - Silent fallback to profiles
4. **Missing required fields** - Silent fallback to profiles
5. **Expired credentials** - AWS error message displays
6. **File updated while running** - Re-open command picks up new credentials

## Usage

```bash
# Generate credentials file from AWS CLI
aws configure export-credentials --format json > ~/.aws/raycast-credentials.json

# Or with SSO
aws sso login --profile my-profile
aws configure export-credentials --profile my-profile --format json > ~/.aws/raycast-credentials.json
```
