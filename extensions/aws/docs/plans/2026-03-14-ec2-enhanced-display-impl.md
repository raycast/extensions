# EC2 Enhanced Display Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance EC2 view with detailed instance info, toggleable detail panel, and start/stop actions for NonProd_PAS account.

**Architecture:** Modify `src/ec2.tsx` to add state icons, detail panel with metadata, and conditional start/stop actions based on active role. Uses existing MFA session hook for role detection.

**Tech Stack:** React, TypeScript, Raycast API, AWS SDK (EC2Client, StartInstancesCommand, StopInstancesCommand)

---

## Task 1: Add State Icon Helper Function

**Files:**
- Modify: `src/ec2.tsx:1-10` (add imports)
- Modify: `src/ec2.tsx:68-84` (add helper before fetchEC2Instances)

**Step 1: Add Color import**

Update imports at top of file:
```typescript
import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
```

**Step 2: Add getStateIcon helper function**

Add before `fetchEC2Instances` function:
```typescript
function getStateIcon(state: string | undefined): { source: Icon; tintColor: Color } {
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

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/ec2.tsx
git commit -m "feat(ec2): add state icon helper function"
```

---

## Task 2: Update List Accessories

**Files:**
- Modify: `src/ec2.tsx:45-67` (EC2Instance component)

**Step 1: Update accessories array**

Replace the existing accessories in EC2Instance:
```typescript
accessories={[
  { icon: getStateIcon(instance.State?.Name), tooltip: `State: ${instance.State?.Name || "unknown"}` },
  { text: instance.InstanceType, tooltip: "Instance Type" },
  { text: instance.Platform || "Linux", tooltip: "Platform" },
]}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Manual test**

Run: `npm run dev`
Expected: EC2 list shows colored state icons, instance type, and platform for each instance

**Step 4: Commit**

```bash
git add src/ec2.tsx
git commit -m "feat(ec2): add state icon, type, platform as list accessories"
```

---

## Task 3: Add Toggleable Detail Panel State

**Files:**
- Modify: `src/ec2.tsx:9-43` (EC2 component)

**Step 1: Add useState import and state**

Add to imports:
```typescript
import { useState } from "react";
```

Add inside EC2 component after useMfaGuard:
```typescript
const [isShowingDetail, setIsShowingDetail] = useState(false);
```

**Step 2: Pass state to List and EC2Instance**

Update List component:
```typescript
<List
  isLoading={isLoading}
  isShowingDetail={isShowingDetail}
  searchBarPlaceholder="Filter instances by name..."
  searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
>
```

Update EC2Instance call:
```typescript
<EC2Instance
  key={i.InstanceId}
  instance={i}
  isShowingDetail={isShowingDetail}
  onToggleDetail={() => setIsShowingDetail(!isShowingDetail)}
/>
```

**Step 3: Update EC2Instance props**

```typescript
function EC2Instance({
  instance,
  isShowingDetail,
  onToggleDetail,
}: {
  instance: Instance;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}) {
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/ec2.tsx
git commit -m "feat(ec2): add isShowingDetail state and pass to components"
```

---

## Task 4: Add Detail Panel Content

**Files:**
- Modify: `src/ec2.tsx:45-67` (EC2Instance component)

**Step 1: Add detail prop to List.Item**

Add detail panel to List.Item:
```typescript
detail={
  isShowingDetail ? (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Instance ID" text={instance.InstanceId || "-"} />
          <List.Item.Detail.Metadata.Label title="Name" text={name || "-"} />
          <List.Item.Detail.Metadata.Label title="Platform" text={instance.Platform || "Linux"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="State" text={instance.State?.Name || "-"} />
          <List.Item.Detail.Metadata.Label
            title="Launch Time"
            text={instance.LaunchTime ? new Date(instance.LaunchTime).toLocaleString() : "-"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Private IP" text={instance.PrivateIpAddress || "-"} />
          <List.Item.Detail.Metadata.Label title="Public IP" text={instance.PublicIpAddress || "-"} />
          <List.Item.Detail.Metadata.Label title="VPC ID" text={instance.VpcId || "-"} />
          <List.Item.Detail.Metadata.Label title="Subnet ID" text={instance.SubnetId || "-"} />
          <List.Item.Detail.Metadata.Label title="Availability Zone" text={instance.Placement?.AvailabilityZone || "-"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Instance Type" text={instance.InstanceType || "-"} />
          <List.Item.Detail.Metadata.Label title="Key Name" text={instance.KeyName || "-"} />
          <List.Item.Detail.Metadata.Label
            title="IAM Role"
            text={instance.IamInstanceProfile?.Arn?.split("/").pop() || "-"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Security Groups"
            text={instance.SecurityGroups?.map((sg) => sg.GroupName).join(", ") || "-"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  ) : undefined
}
```

**Step 2: Add toggle action to ActionPanel**

Add at the end of ActionPanel (before closing tag):
```typescript
<Action
  title={isShowingDetail ? "Hide Details" : "Show Details"}
  icon={Icon.Sidebar}
  shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
  onAction={onToggleDetail}
/>
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual test**

Run: `npm run dev`
Expected: Cmd+Shift+D toggles detail panel showing all instance metadata

**Step 5: Commit**

```bash
git add src/ec2.tsx
git commit -m "feat(ec2): add toggleable detail panel with instance metadata"
```

---

## Task 5: Add Start/Stop Imports and Role Check

**Files:**
- Modify: `src/ec2.tsx:1-10` (imports)
- Modify: `src/ec2.tsx:9-15` (add useMfaSession import and use)

**Step 1: Add AWS SDK imports**

Update EC2 client import:
```typescript
import {
  DescribeInstancesCommand,
  EC2Client,
  Instance,
  StartInstancesCommand,
  StopInstancesCommand,
} from "@aws-sdk/client-ec2";
```

**Step 2: Add Raycast toast imports**

Update Raycast imports:
```typescript
import { ActionPanel, List, Action, Icon, Color, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
```

**Step 3: Import useMfaSession**

Add to imports:
```typescript
import { useMfaSession } from "./hooks/use-mfa-session";
```

**Step 4: Get activeRole in EC2 component**

Add after useMfaGuard:
```typescript
const { activeRole } = useMfaSession();
const canManageInstances = activeRole === "developer-npn";
```

**Step 5: Pass canManageInstances to EC2Instance**

Update EC2Instance call:
```typescript
<EC2Instance
  key={i.InstanceId}
  instance={i}
  isShowingDetail={isShowingDetail}
  onToggleDetail={() => setIsShowingDetail(!isShowingDetail)}
  canManageInstances={canManageInstances}
  revalidate={revalidate}
/>
```

**Step 6: Update EC2Instance props**

```typescript
function EC2Instance({
  instance,
  isShowingDetail,
  onToggleDetail,
  canManageInstances,
  revalidate,
}: {
  instance: Instance;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  canManageInstances: boolean;
  revalidate: () => void;
}) {
```

**Step 7: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 8: Commit**

```bash
git add src/ec2.tsx
git commit -m "feat(ec2): add start/stop imports and role check"
```

---

## Task 6: Add Start Instance Action

**Files:**
- Modify: `src/ec2.tsx` (inside EC2Instance, before toggle action)

**Step 1: Add helper variables**

Add at start of EC2Instance function:
```typescript
const isRunning = instance.State?.Name === "running";
const isStopped = instance.State?.Name === "stopped";
const isTransitional = ["pending", "stopping", "shutting-down"].includes(instance.State?.Name || "");
```

**Step 2: Add startInstance handler**

Add after helper variables:
```typescript
const startInstance = async () => {
  try {
    await showToast({ style: Toast.Style.Animated, title: "Starting instance..." });
    await new EC2Client({}).send(
      new StartInstancesCommand({ InstanceIds: [instance.InstanceId!] })
    );
    await showToast({ style: Toast.Style.Success, title: "Instance starting", message: name || instance.InstanceId });
    revalidate();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start instance",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
```

**Step 3: Add Start action to ActionPanel**

Add in ActionPanel (after copy actions, before toggle):
```typescript
{canManageInstances && isStopped && !isTransitional && (
  <Action
    title="Start Instance"
    icon={Icon.Play}
    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
    onAction={startInstance}
  />
)}
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/ec2.tsx
git commit -m "feat(ec2): add start instance action for NonProd_PAS"
```

---

## Task 7: Add Stop Instance Action with Confirmation

**Files:**
- Modify: `src/ec2.tsx` (inside EC2Instance)

**Step 1: Add stopInstance handler with confirmation**

Add after startInstance handler:
```typescript
const stopInstance = async () => {
  const confirmed = await confirmAlert({
    title: "Stop Instance",
    message: `Are you sure you want to stop ${name || instance.InstanceId}?`,
    primaryAction: {
      title: "Stop",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!confirmed) return;

  try {
    await showToast({ style: Toast.Style.Animated, title: "Stopping instance..." });
    await new EC2Client({}).send(
      new StopInstancesCommand({ InstanceIds: [instance.InstanceId!] })
    );
    await showToast({ style: Toast.Style.Success, title: "Instance stopping", message: name || instance.InstanceId });
    revalidate();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop instance",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
```

**Step 2: Add Stop action to ActionPanel**

Add after Start action:
```typescript
{canManageInstances && isRunning && !isTransitional && (
  <Action
    title="Stop Instance"
    icon={Icon.Stop}
    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
    style={Action.Style.Destructive}
    onAction={stopInstance}
  />
)}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Manual test**

Run: `npm run dev`
Expected:
- With developer-npn role: Start/Stop actions appear based on instance state
- With main role: No Start/Stop actions visible
- Stop action shows confirmation dialog

**Step 5: Commit**

```bash
git add src/ec2.tsx
git commit -m "feat(ec2): add stop instance action with confirmation dialog"
```

---

## Task 8: Final Cleanup and Lint

**Files:**
- Modify: `src/ec2.tsx`

**Step 1: Run linter**

Run: `npm run lint`
Expected: No errors (fix any that appear)

**Step 2: Run fix-lint if needed**

Run: `npm run fix-lint`
Expected: All lint issues resolved

**Step 3: Final build verification**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Final commit**

```bash
git add src/ec2.tsx
git commit -m "chore(ec2): lint and cleanup"
```

---

## Summary

After completing all tasks, `src/ec2.tsx` will have:
- Color-coded state icons (green/red/yellow/gray)
- Instance type and platform as accessories
- Toggleable detail panel (Cmd+Shift+D) with all metadata
- Start action (Cmd+Shift+S) for stopped instances in NonProd_PAS
- Stop action (Cmd+Shift+X) with confirmation for running instances in NonProd_PAS
