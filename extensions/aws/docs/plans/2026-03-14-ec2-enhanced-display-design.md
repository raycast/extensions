# EC2 Enhanced Display and Instance Management

**Date:** 2026-03-14
**Status:** Approved

## Summary

Enhance the EC2 instances view with detailed instance information, a toggleable detail panel, and start/stop actions restricted to the NonProd_PAS account.

## Requirements

- Display instance state with color-coded icons
- Show instance type and platform as list accessories
- Toggleable detail panel with all instance metadata
- Start/Stop actions only available for NonProd_PAS account (developer-npn role)
- Confirmation dialog for stop action only

## UI Layout

### List Accessories

Each instance displays three accessories (left to right):
1. **State Icon** - Color-coded circle (green=running, red=stopped, yellow=pending/stopping, gray=terminated)
2. **Instance Type** - e.g., t3.medium
3. **Platform** - Linux or Windows

### Detail Panel

Toggled with `Cmd+Shift+D`. Displays all metadata in sections:

| Section | Fields |
|---------|--------|
| Identity | Instance ID, Name, Platform |
| State | State, Launch Time |
| Network | Private IP, Public IP, VPC ID, Subnet ID, Availability Zone |
| Configuration | Instance Type, Key Name, IAM Role |
| Security | Security Groups (comma-separated) |

## Start/Stop Actions

### Visibility

Actions only visible when `activeRole === "developer-npn"` (NonProd_PAS account).

### Action Details

| Action | Icon | Shortcut | Confirmation | Visible When |
|--------|------|----------|--------------|--------------|
| Start Instance | Play | Cmd+Shift+S | None | State is `stopped` |
| Stop Instance | Stop | Cmd+Shift+X | Alert dialog | State is `running` |

### Stop Confirmation Dialog

- Title: "Stop Instance"
- Message: "Are you sure you want to stop {instance-name}?"
- Primary action: "Stop" (destructive style)

### Transitional States

When instance is in `pending`, `shutting-down`, or `stopping` state:
- Show yellow state icon
- Disable both Start and Stop actions

## Architecture

### Files Changed

**Modified:** `src/ec2.tsx`
- Add `isShowingDetail` state with toggle action
- Update `EC2Instance` component with detail panel and new accessories
- Add `StartInstanceAction` and `StopInstanceAction` components
- Import `StartInstancesCommand`, `StopInstancesCommand` from `@aws-sdk/client-ec2`

### Helper Function

```typescript
function getStateIcon(state: string): { source: Icon; tintColor: Color } {
  switch (state) {
    case "running":
      return { source: Icon.CircleFilled, tintColor: Color.Green };
    case "stopped":
      return { source: Icon.CircleFilled, tintColor: Color.Red };
    case "pending":
    case "stopping":
    case "shutting-down":
      return { source: Icon.CircleFilled, tintColor: Color.Yellow };
    case "terminated":
    default:
      return { source: Icon.CircleFilled, tintColor: Color.SecondaryText };
  }
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Start/Stop API error | Show `showFailureToast` with error message |
| Start/Stop success | Show `showToast` with success message |
| Instance in transitional state | Disable both Start/Stop actions |
| Missing fields (e.g., no public IP) | Show "-" in detail panel |

## Testing

| Test Case | Expected Result |
|-----------|-----------------|
| List view | Instances show state icon + type + platform |
| Toggle details | Cmd+Shift+D shows/hides detail panel |
| Detail panel | All 12 fields displayed correctly |
| NonProd_PAS role | Start/Stop actions visible |
| Main role | Start/Stop actions hidden |
| Stopped instance | Start action visible, Stop hidden |
| Running instance | Stop action visible, Start hidden |
| Stop confirmation | Dialog appears before stopping |
| Start - no confirm | Starts immediately |
| Transitional state | Yellow icon, actions disabled |
| Missing public IP | Shows "-" in detail panel |
