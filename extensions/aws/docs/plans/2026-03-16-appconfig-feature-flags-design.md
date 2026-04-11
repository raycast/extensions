# AppConfig Feature Flags Command Design

## Overview

Add a new Raycast command to view and manage AWS AppConfig feature flags with hierarchical navigation, full flag details, and toggle functionality.

## Requirements

- **Navigation**: Applications → Configuration Profiles → Feature Flags
- **View**: Full flag details (name, status, description, variants, constraints, last modified)
- **Actions**: Copy flag name/JSON, toggle enabled/disabled, open in AWS Console
- **Auth**: Use existing MFA guard pattern with role dropdown for account selection

## File Structure

```
src/
├── appconfig.tsx                    # Main command entry (Applications list)
├── hooks/
│   └── use-appconfig.ts             # All AppConfig hooks
├── components/
│   └── appconfig/
│       ├── AppConfigProfiles.tsx    # Configuration profiles list
│       └── AppConfigFlags.tsx       # Feature flags list with details
```

## Dependencies

```json
{
  "@aws-sdk/client-appconfig": "^3.x.x",
  "@aws-sdk/client-appconfigdata": "^3.x.x"
}
```

## Command Registration

```json
{
  "name": "appconfig",
  "title": "AppConfig Feature Flags",
  "description": "View and manage feature flags",
  "mode": "view"
}
```

## Navigation Flow

### Level 1: Applications List (`appconfig.tsx`)

- **Fetch**: `ListApplicationsCommand`
- **Display**: Application name, description
- **Action**: Push to configuration profiles

### Level 2: Configuration Profiles (`AppConfigProfiles.tsx`)

- **Fetch**: `ListConfigurationProfilesCommand` (filtered by application ID)
- **Filter**: Show only `AWS.AppConfig.FeatureFlags` type profiles
- **Display**: Profile name, type, description
- **Action**: Push to feature flags

### Level 3: Feature Flags (`AppConfigFlags.tsx`)

- **Fetch**: `GetLatestConfigurationCommand` from appconfigdata client
- **Parse**: AWS AppConfig Feature Flags JSON format:
  ```json
  {
    "flags": {
      "flag-name": { "name": "...", "description": "...", ... }
    },
    "values": {
      "flag-name": { "enabled": true, "variants": {...} }
    }
  }
  ```
- **Display**: Flag name, enabled/disabled, description, variants, constraints

## UI Design

### Flag List Item

```
[Icon: checkmark/x]  flag-name
                     Description text
                     [Tag: enabled/disabled] [variants] [date]
```

### Detail Panel (Cmd+Shift+D)

- Flag name
- Enabled status
- Description
- Variants (name → value for each)
- Constraints (targeting rules)
- Last modified timestamp

### Actions

| Action | Shortcut | Description |
|--------|----------|-------------|
| Toggle Flag | Cmd+T | Enable/disable with confirmation |
| Copy Flag Name | Cmd+C | Copy flag key to clipboard |
| Copy Flag Value | Cmd+Shift+C | Copy full flag config as JSON |
| Open in Console | Enter | Open AppConfig in AWS Console |
| Refresh | Cmd+R | Reload flag list |

## Toggle Flow

1. Show confirmation dialog: "Enable/Disable `flag-name`?"
2. User confirms
3. Read current configuration
4. Modify `values[flag-name].enabled`
5. Create new hosted configuration version (`CreateHostedConfigurationVersionCommand`)
6. Start deployment (`StartDeploymentCommand`)
7. Show success/failure toast
8. Refresh flag list

## Error Handling

### Empty States

- No applications: "No AppConfig applications found"
- No feature flag profiles: "No feature flag profiles in this application"
- No flags: "No feature flags configured"

### Error States

- AWS API errors: Show in `List.EmptyView` with error title/message
- Toggle failure: Toast with error, no state change
- MFA expired: Show `MfaPrompt` component

### Loading States

- `isLoading={true}` on List during fetch
- Toast "Toggling flag..." during toggle operation

### Edge Cases

- Flag without description: Show "-" or empty
- Complex variants: Show count in accessories, full details in panel
- Deployment in progress: Disable toggle, show "Deployment in progress" tag

## Out of Scope

- Creating new flags from Raycast
- Editing flag variants or constraints
- Managing environments separately from roles
- Deployment strategies (instant deployment only)
- Rollback functionality

## Implementation Notes

- Follow existing patterns from `secrets.tsx` and `use-secrets.ts`
- Use `useCachedPromise` from `@raycast/utils` for data fetching
- Use `isReadyToFetch()` guard for AWS calls
- Reuse `AwsMfaRoleDropdown` and `MfaPrompt` components
