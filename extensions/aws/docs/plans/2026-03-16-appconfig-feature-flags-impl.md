# AppConfig Feature Flags Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Raycast command to view and manage AWS AppConfig feature flags with hierarchical navigation and toggle functionality.

**Architecture:** Three-level navigation (Applications → Configuration Profiles → Flags) using React components with Action.Push. Hooks fetch data via AWS SDK clients. Toggle updates configuration and triggers deployment.

**Tech Stack:** TypeScript, React, @raycast/api, @aws-sdk/client-appconfig, @aws-sdk/client-appconfigdata

---

### Task 1: Install AWS SDK Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add AppConfig SDK packages**

```bash
npm install @aws-sdk/client-appconfig @aws-sdk/client-appconfigdata
```

**Step 2: Verify installation**

Run: `npm ls @aws-sdk/client-appconfig @aws-sdk/client-appconfigdata`
Expected: Both packages listed without errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add AppConfig SDK dependencies"
```

---

### Task 2: Register Command in package.json

**Files:**
- Modify: `package.json` (commands array, around line 178)

**Step 1: Add command entry**

Add to the `commands` array in `package.json`:

```json
{
  "name": "appconfig",
  "title": "AppConfig Feature Flags",
  "description": "View and manage feature flags",
  "mode": "view"
}
```

**Step 2: Verify JSON is valid**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat(appconfig): register command in package.json"
```

---

### Task 3: Create AppConfig Hooks - List Applications

**Files:**
- Create: `src/hooks/use-appconfig.ts`

**Step 1: Create the hooks file with useAppConfigApps**

```typescript
import { useCachedPromise } from "@raycast/utils";
import {
  AppConfigClient,
  ListApplicationsCommand,
  ListConfigurationProfilesCommand,
  ListEnvironmentsCommand,
  Application,
  ConfigurationProfile,
  Environment,
} from "@aws-sdk/client-appconfig";
import {
  AppConfigDataClient,
  GetLatestConfigurationCommand,
  StartConfigurationSessionCommand,
} from "@aws-sdk/client-appconfigdata";
import { isReadyToFetch } from "../util";

export function useAppConfigApps() {
  const {
    data: apps,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const client = new AppConfigClient({});
      const { Items } = await client.send(new ListApplicationsCommand({}));
      return Items ?? [];
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "Failed to load AppConfig applications" } }
  );

  return { apps, error, isLoading: (!apps && !error) || isLoading, revalidate };
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/use-appconfig.ts
git commit -m "feat(appconfig): add useAppConfigApps hook"
```

---

### Task 4: Create AppConfig Hooks - List Profiles and Environments

**Files:**
- Modify: `src/hooks/use-appconfig.ts`

**Step 1: Add useAppConfigProfiles hook**

Add to `src/hooks/use-appconfig.ts`:

```typescript
export function useAppConfigProfiles(applicationId: string) {
  const {
    data: profiles,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (appId: string) => {
      const client = new AppConfigClient({});
      const { Items } = await client.send(
        new ListConfigurationProfilesCommand({ ApplicationId: appId })
      );
      // Filter to only feature flag profiles
      return (Items ?? []).filter((p) => p.Type === "AWS.AppConfig.FeatureFlags");
    },
    [applicationId],
    { execute: isReadyToFetch() && !!applicationId, failureToastOptions: { title: "Failed to load configuration profiles" } }
  );

  return { profiles, error, isLoading: (!profiles && !error) || isLoading, revalidate };
}

export function useAppConfigEnvironments(applicationId: string) {
  const {
    data: environments,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (appId: string) => {
      const client = new AppConfigClient({});
      const { Items } = await client.send(
        new ListEnvironmentsCommand({ ApplicationId: appId })
      );
      return Items ?? [];
    },
    [applicationId],
    { execute: isReadyToFetch() && !!applicationId, failureToastOptions: { title: "Failed to load environments" } }
  );

  return { environments, error, isLoading: (!environments && !error) || isLoading, revalidate };
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/use-appconfig.ts
git commit -m "feat(appconfig): add useAppConfigProfiles and useAppConfigEnvironments hooks"
```

---

### Task 5: Create AppConfig Hooks - Get Feature Flags

**Files:**
- Modify: `src/hooks/use-appconfig.ts`

**Step 1: Add types and useFeatureFlags hook**

Add to `src/hooks/use-appconfig.ts`:

```typescript
export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  variants?: Record<string, unknown>;
  constraints?: unknown[];
}

export interface FeatureFlagsConfig {
  flags: Record<string, { name: string; description?: string; _variants?: Record<string, unknown>; _constraints?: unknown[] }>;
  values: Record<string, { enabled: boolean; [key: string]: unknown }>;
  version?: string;
}

export function useFeatureFlags(
  applicationId: string,
  environmentId: string,
  configurationProfileId: string
) {
  const {
    data,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (appId: string, envId: string, profileId: string) => {
      const client = new AppConfigDataClient({});

      // Start session
      const sessionResponse = await client.send(
        new StartConfigurationSessionCommand({
          ApplicationIdentifier: appId,
          EnvironmentIdentifier: envId,
          ConfigurationProfileIdentifier: profileId,
        })
      );

      if (!sessionResponse.InitialConfigurationToken) {
        throw new Error("Failed to start configuration session");
      }

      // Get latest configuration
      const configResponse = await client.send(
        new GetLatestConfigurationCommand({
          ConfigurationToken: sessionResponse.InitialConfigurationToken,
        })
      );

      if (!configResponse.Configuration) {
        return { flags: [], rawConfig: null };
      }

      const configText = new TextDecoder().decode(configResponse.Configuration);
      const config = JSON.parse(configText) as FeatureFlagsConfig;

      // Transform to flat list
      const flags: FeatureFlag[] = Object.entries(config.flags).map(([key, flagDef]) => ({
        key,
        name: flagDef.name || key,
        description: flagDef.description,
        enabled: config.values[key]?.enabled ?? false,
        variants: flagDef._variants,
        constraints: flagDef._constraints,
      }));

      return { flags, rawConfig: config };
    },
    [applicationId, environmentId, configurationProfileId],
    {
      execute: isReadyToFetch() && !!applicationId && !!environmentId && !!configurationProfileId,
      failureToastOptions: { title: "Failed to load feature flags" },
    }
  );

  return {
    flags: data?.flags ?? [],
    rawConfig: data?.rawConfig ?? null,
    error,
    isLoading: (!data && !error) || isLoading,
    revalidate,
  };
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/use-appconfig.ts
git commit -m "feat(appconfig): add useFeatureFlags hook"
```

---

### Task 6: Create Main Command - Applications List

**Files:**
- Create: `src/appconfig.tsx`

**Step 1: Create the main command file**

```typescript
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { Application } from "@aws-sdk/client-appconfig";
import { useAppConfigApps } from "./hooks/use-appconfig";
import { MfaPrompt, useMfaGuard } from "./components/MfaPrompt";
import AwsMfaRoleDropdown from "./components/searchbar/aws-mfa-role-dropdown";
import { AppConfigProfiles } from "./components/appconfig/AppConfigProfiles";

export default function AppConfig() {
  const { needsMfa, isLoading: mfaLoading, activeRole, revalidate: revalidateMfa, setAuthenticated } = useMfaGuard();
  const { apps, error, isLoading, revalidate } = useAppConfigApps();

  if (mfaLoading) {
    return <List isLoading={true} />;
  }

  if (needsMfa) {
    return (
      <MfaPrompt
        roleId={activeRole}
        onSuccess={() => {
          setAuthenticated(true);
          revalidateMfa();
          revalidate();
        }}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter applications by name..."
      searchBarAccessory={<AwsMfaRoleDropdown onRoleSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      ) : apps?.length === 0 ? (
        <List.EmptyView
          title="No AppConfig applications found"
          icon={{ source: Icon.AppWindowList, tintColor: Color.Orange }}
        />
      ) : (
        apps?.map((app) => <AppConfigApp key={app.Id} app={app} />)
      )}
    </List>
  );
}

function AppConfigApp({ app }: { app: Application }) {
  const AWS_REGION = process.env.AWS_REGION;

  return (
    <List.Item
      key={app.Id}
      title={app.Name || "Unnamed Application"}
      subtitle={app.Description || ""}
      icon={{ source: Icon.AppWindowList, tintColor: Color.Blue }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Configuration Profiles"
            icon={Icon.List}
            target={<AppConfigProfiles applicationId={app.Id!} applicationName={app.Name!} />}
          />
          <Action.OpenInBrowser
            title="Open in AWS Console"
            url={`https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${app.Id}?region=${AWS_REGION}`}
          />
          <Action.CopyToClipboard title="Copy Application ID" content={app.Id || ""} />
        </ActionPanel>
      }
      accessories={[{ text: app.Id }]}
    />
  );
}
```

**Step 2: Verify build (will fail - missing AppConfigProfiles)**

Run: `npm run build`
Expected: Error about missing `AppConfigProfiles` component

**Step 3: Commit (partial)**

```bash
git add src/appconfig.tsx
git commit -m "feat(appconfig): add main command with applications list"
```

---

### Task 7: Create Configuration Profiles Component

**Files:**
- Create: `src/components/appconfig/AppConfigProfiles.tsx`

**Step 1: Create the component**

```typescript
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ConfigurationProfile } from "@aws-sdk/client-appconfig";
import { useAppConfigProfiles, useAppConfigEnvironments } from "../../hooks/use-appconfig";
import { AppConfigFlags } from "./AppConfigFlags";

interface Props {
  applicationId: string;
  applicationName: string;
}

export function AppConfigProfiles({ applicationId, applicationName }: Props) {
  const { profiles, error, isLoading } = useAppConfigProfiles(applicationId);
  const { environments } = useAppConfigEnvironments(applicationId);

  // Use first environment as default (or could add env picker)
  const defaultEnvironment = environments?.[0];

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${applicationName} - Configuration Profiles`}
      searchBarPlaceholder="Filter profiles by name..."
    >
      {error ? (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      ) : profiles?.length === 0 ? (
        <List.EmptyView
          title="No feature flag profiles found"
          description="Only AWS.AppConfig.FeatureFlags profiles are shown"
          icon={{ source: Icon.AppWindowList, tintColor: Color.Orange }}
        />
      ) : (
        profiles?.map((profile) => (
          <ConfigurationProfileItem
            key={profile.Id}
            profile={profile}
            applicationId={applicationId}
            applicationName={applicationName}
            environmentId={defaultEnvironment?.Id}
            environmentName={defaultEnvironment?.Name}
          />
        ))
      )}
    </List>
  );
}

function ConfigurationProfileItem({
  profile,
  applicationId,
  applicationName,
  environmentId,
  environmentName,
}: {
  profile: ConfigurationProfile;
  applicationId: string;
  applicationName: string;
  environmentId?: string;
  environmentName?: string;
}) {
  const AWS_REGION = process.env.AWS_REGION;

  return (
    <List.Item
      key={profile.Id}
      title={profile.Name || "Unnamed Profile"}
      subtitle={profile.Description || ""}
      icon={{ source: Icon.Document, tintColor: Color.Purple }}
      actions={
        <ActionPanel>
          {environmentId ? (
            <Action.Push
              title="View Feature Flags"
              icon={Icon.List}
              target={
                <AppConfigFlags
                  applicationId={applicationId}
                  applicationName={applicationName}
                  configurationProfileId={profile.Id!}
                  configurationProfileName={profile.Name!}
                  environmentId={environmentId}
                  environmentName={environmentName || "Default"}
                />
              }
            />
          ) : (
            <Action title="No Environment Available" icon={Icon.Warning} />
          )}
          <Action.OpenInBrowser
            title="Open in AWS Console"
            url={`https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${applicationId}/configurationprofiles/${profile.Id}?region=${AWS_REGION}`}
          />
          <Action.CopyToClipboard title="Copy Profile ID" content={profile.Id || ""} />
        </ActionPanel>
      }
      accessories={[
        { tag: { value: "Feature Flags", color: Color.Purple } },
        { text: profile.Id },
      ]}
    />
  );
}
```

**Step 2: Verify build (will fail - missing AppConfigFlags)**

Run: `npm run build`
Expected: Error about missing `AppConfigFlags` component

**Step 3: Commit**

```bash
mkdir -p src/components/appconfig
git add src/components/appconfig/AppConfigProfiles.tsx
git commit -m "feat(appconfig): add configuration profiles component"
```

---

### Task 8: Create Feature Flags Component

**Files:**
- Create: `src/components/appconfig/AppConfigFlags.tsx`

**Step 1: Create the component**

```typescript
import { Action, ActionPanel, Color, Icon, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState } from "react";
import { useFeatureFlags, FeatureFlag } from "../../hooks/use-appconfig";

interface Props {
  applicationId: string;
  applicationName: string;
  configurationProfileId: string;
  configurationProfileName: string;
  environmentId: string;
  environmentName: string;
}

export function AppConfigFlags({
  applicationId,
  applicationName,
  configurationProfileId,
  configurationProfileName,
  environmentId,
  environmentName,
}: Props) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { flags, rawConfig, error, isLoading, revalidate } = useFeatureFlags(
    applicationId,
    environmentId,
    configurationProfileId
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={`${applicationName} - ${configurationProfileName} - Feature Flags`}
      searchBarPlaceholder="Filter flags by name..."
    >
      {error ? (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      ) : flags.length === 0 ? (
        <List.EmptyView
          title="No feature flags configured"
          icon={{ source: Icon.AppWindowList, tintColor: Color.Orange }}
        />
      ) : (
        flags.map((flag) => (
          <FeatureFlagItem
            key={flag.key}
            flag={flag}
            applicationId={applicationId}
            configurationProfileId={configurationProfileId}
            environmentId={environmentId}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail(!isShowingDetail)}
            revalidate={revalidate}
          />
        ))
      )}
    </List>
  );
}

function FeatureFlagItem({
  flag,
  applicationId,
  configurationProfileId,
  environmentId,
  isShowingDetail,
  onToggleDetail,
  revalidate,
}: {
  flag: FeatureFlag;
  applicationId: string;
  configurationProfileId: string;
  environmentId: string;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  revalidate: () => void;
}) {
  const AWS_REGION = process.env.AWS_REGION;
  const variantCount = flag.variants ? Object.keys(flag.variants).length : 0;

  const handleToggle = async () => {
    const action = flag.enabled ? "Disable" : "Enable";
    const confirmed = await confirmAlert({
      title: `${action} Feature Flag`,
      message: `Are you sure you want to ${action.toLowerCase()} "${flag.name}"?`,
      primaryAction: {
        title: action,
        style: flag.enabled ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    await showToast({
      style: Toast.Style.Animated,
      title: `${action === "Enable" ? "Enabling" : "Disabling"} flag...`,
    });

    // TODO: Implement toggle via CreateHostedConfigurationVersionCommand + StartDeploymentCommand
    await showToast({
      style: Toast.Style.Failure,
      title: "Toggle not yet implemented",
      message: "Coming in next update",
    });
  };

  return (
    <List.Item
      key={flag.key}
      title={flag.name}
      subtitle={flag.description || ""}
      icon={
        flag.enabled
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : { source: Icon.XMarkCircle, tintColor: Color.Red }
      }
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Key" text={flag.key} />
                <List.Item.Detail.Metadata.Label title="Name" text={flag.name} />
                <List.Item.Detail.Metadata.Label
                  title="Status"
                  text={flag.enabled ? "Enabled" : "Disabled"}
                  icon={flag.enabled ? Icon.CheckCircle : Icon.XMarkCircle}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Description" text={flag.description || "-"} />
                {variantCount > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Variants" text={`${variantCount} variant(s)`} />
                  </>
                )}
                {flag.constraints && flag.constraints.length > 0 && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Constraints"
                      text={`${flag.constraints.length} constraint(s)`}
                    />
                  </>
                )}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={flag.enabled ? "Disable Flag" : "Enable Flag"}
            icon={flag.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={handleToggle}
          />
          <Action.CopyToClipboard
            title="Copy Flag Key"
            content={flag.key}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Flag as JSON"
            content={JSON.stringify(flag, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open in AWS Console"
            url={`https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${applicationId}/configurationprofiles/${configurationProfileId}?region=${AWS_REGION}`}
          />
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
      accessories={[
        { tag: { value: flag.enabled ? "Enabled" : "Disabled", color: flag.enabled ? Color.Green : Color.Red } },
        ...(variantCount > 0 ? [{ text: `${variantCount} variants` }] : []),
      ]}
    />
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/appconfig/AppConfigFlags.tsx
git commit -m "feat(appconfig): add feature flags component with view and copy actions"
```

---

### Task 9: Add Toggle Implementation

**Files:**
- Modify: `src/hooks/use-appconfig.ts`
- Modify: `src/components/appconfig/AppConfigFlags.tsx`

**Step 1: Add toggleFeatureFlag function to hooks**

Add to `src/hooks/use-appconfig.ts`:

```typescript
import {
  AppConfigClient,
  ListApplicationsCommand,
  ListConfigurationProfilesCommand,
  ListEnvironmentsCommand,
  CreateHostedConfigurationVersionCommand,
  StartDeploymentCommand,
  GetConfigurationProfileCommand,
  Application,
  ConfigurationProfile,
  Environment,
} from "@aws-sdk/client-appconfig";

// Add this function at the end of the file
export async function toggleFeatureFlag(
  applicationId: string,
  configurationProfileId: string,
  environmentId: string,
  flagKey: string,
  currentConfig: FeatureFlagsConfig,
  newEnabledState: boolean
): Promise<void> {
  const client = new AppConfigClient({});

  // Update the config
  const updatedConfig = {
    ...currentConfig,
    values: {
      ...currentConfig.values,
      [flagKey]: {
        ...currentConfig.values[flagKey],
        enabled: newEnabledState,
      },
    },
  };

  // Create new configuration version
  const versionResponse = await client.send(
    new CreateHostedConfigurationVersionCommand({
      ApplicationId: applicationId,
      ConfigurationProfileId: configurationProfileId,
      Content: new TextEncoder().encode(JSON.stringify(updatedConfig)),
      ContentType: "application/json",
    })
  );

  if (!versionResponse.VersionNumber) {
    throw new Error("Failed to create configuration version");
  }

  // Deploy immediately
  await client.send(
    new StartDeploymentCommand({
      ApplicationId: applicationId,
      EnvironmentId: environmentId,
      ConfigurationProfileId: configurationProfileId,
      ConfigurationVersion: String(versionResponse.VersionNumber),
      DeploymentStrategyId: "AppConfig.AllAtOnce", // Instant deployment
    })
  );
}
```

**Step 2: Update AppConfigFlags component to use toggle**

Update the `handleToggle` function in `src/components/appconfig/AppConfigFlags.tsx`:

First, add the import at the top:
```typescript
import { useFeatureFlags, FeatureFlag, toggleFeatureFlag, FeatureFlagsConfig } from "../../hooks/use-appconfig";
```

Update the `AppConfigFlags` component to pass rawConfig:
```typescript
// In the flags.map, pass rawConfig to FeatureFlagItem
<FeatureFlagItem
  key={flag.key}
  flag={flag}
  rawConfig={rawConfig}
  applicationId={applicationId}
  // ... rest of props
/>
```

Update `FeatureFlagItem` to accept and use rawConfig:
```typescript
function FeatureFlagItem({
  flag,
  rawConfig,
  applicationId,
  configurationProfileId,
  environmentId,
  isShowingDetail,
  onToggleDetail,
  revalidate,
}: {
  flag: FeatureFlag;
  rawConfig: FeatureFlagsConfig | null;
  applicationId: string;
  configurationProfileId: string;
  environmentId: string;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  revalidate: () => void;
}) {
  // ... existing code ...

  const handleToggle = async () => {
    if (!rawConfig) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot toggle flag",
        message: "Configuration not loaded",
      });
      return;
    }

    const action = flag.enabled ? "Disable" : "Enable";
    const confirmed = await confirmAlert({
      title: `${action} Feature Flag`,
      message: `Are you sure you want to ${action.toLowerCase()} "${flag.name}"?`,
      primaryAction: {
        title: action,
        style: flag.enabled ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${action === "Enable" ? "Enabling" : "Disabling"} flag...`,
    });

    try {
      await toggleFeatureFlag(
        applicationId,
        configurationProfileId,
        environmentId,
        flag.key,
        rawConfig,
        !flag.enabled
      );

      toast.style = Toast.Style.Success;
      toast.title = `Flag ${action.toLowerCase()}d`;
      toast.message = flag.name;

      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to ${action.toLowerCase()} flag`;
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  // ... rest of component
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/hooks/use-appconfig.ts src/components/appconfig/AppConfigFlags.tsx
git commit -m "feat(appconfig): implement feature flag toggle functionality"
```

---

### Task 10: Add Console URL Utility

**Files:**
- Modify: `src/util/index.ts`

**Step 1: Add AppConfig resource types to resourceToConsoleLink**

Add these cases to the switch statement in `resourceToConsoleLink`:

```typescript
case "AWS::AppConfig::Application":
  return `https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${resourceId}?region=${AWS_REGION}`;
case "AWS::AppConfig::ConfigurationProfile": {
  const [appId, profileId] = resourceId.split("/");
  return `https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${appId}/configurationprofiles/${profileId}?region=${AWS_REGION}`;
}
case "AWS::AppConfig::Environment": {
  const [appId, envId] = resourceId.split("/");
  return `https://${AWS_REGION}.console.aws.amazon.com/systems-manager/appconfig/applications/${appId}/environments/${envId}?region=${AWS_REGION}`;
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/util/index.ts
git commit -m "feat(appconfig): add console URL utilities"
```

---

### Task 11: Final Build and Test

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No lint errors (or fix any that appear)

**Step 3: Manual testing checklist**

- [ ] Open "AppConfig Feature Flags" command
- [ ] MFA prompt appears if session expired
- [ ] Applications list loads
- [ ] Select application → profiles list loads
- [ ] Only feature flag profiles shown (not freeform)
- [ ] Select profile → flags list loads
- [ ] Flag details panel works (Cmd+Shift+D)
- [ ] Copy flag key works (Cmd+C)
- [ ] Copy flag JSON works (Cmd+Shift+C)
- [ ] Toggle flag works with confirmation
- [ ] Role dropdown switches accounts correctly

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(appconfig): complete AppConfig feature flags command"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install SDK dependencies | package.json |
| 2 | Register command | package.json |
| 3 | Create useAppConfigApps hook | use-appconfig.ts |
| 4 | Create useAppConfigProfiles/Environments hooks | use-appconfig.ts |
| 5 | Create useFeatureFlags hook | use-appconfig.ts |
| 6 | Create main command | appconfig.tsx |
| 7 | Create profiles component | AppConfigProfiles.tsx |
| 8 | Create flags component | AppConfigFlags.tsx |
| 9 | Implement toggle | use-appconfig.ts, AppConfigFlags.tsx |
| 10 | Add console URL utilities | util/index.ts |
| 11 | Final build and test | All files |
