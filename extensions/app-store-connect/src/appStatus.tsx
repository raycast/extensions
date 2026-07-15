import { useMemo, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAppStoreConnectApi } from "./Hooks/useAppStoreConnect";
import { appsWithVersionsResponseSchema, AppStatusVersion, AppWithVersions } from "./Model/schemas";
import SignIn from "./Components/SignIn";
import AppStatusListItem from "./Components/AppStatusListItem";

export interface ProcessedAppVersion {
  id: string;
  versionString: string;
  state: string;
  platform: string;
  createdDate: string;
  releaseType: string | null;
}

export interface ProcessedApp {
  id: string;
  name: string;
  bundleId: string;
  versions: ProcessedAppVersion[];
  appStoreConnectUrl: string;
}

export interface PendingRelease {
  app: ProcessedApp;
  version: ProcessedAppVersion;
}

export type StatusFilter = "all" | string;
export type PlatformFilter = "all" | "IOS" | "MAC_OS" | "TV_OS" | "VISION_OS";

export const STATUS_FILTERS: { value: StatusFilter; label: string; icon: Icon }[] = [
  { value: "all", label: "All Apps", icon: Icon.List },
  { value: "READY_FOR_SALE", label: "✅ Ready for Sale", icon: Icon.CheckCircle },
  { value: "IN_REVIEW", label: "👀 In Review", icon: Icon.Eye },
  { value: "WAITING_FOR_REVIEW", label: "⏳ Waiting for Review", icon: Icon.Clock },
  { value: "PENDING_DEVELOPER_RELEASE", label: "🚀 Pending Developer Release", icon: Icon.Clock },
  { value: "PREPARE_FOR_SUBMISSION", label: "✏️ Prepare for Submission", icon: Icon.Pencil },
  { value: "REJECTED", label: "❌ Rejected", icon: Icon.XMarkCircle },
];

const PLATFORM_FILTERS: { value: PlatformFilter; label: string; icon: Icon }[] = [
  { value: "all", label: "All Platforms", icon: Icon.List },
  { value: "IOS", label: "iOS", icon: Icon.Mobile },
  { value: "MAC_OS", label: "macOS", icon: Icon.Monitor },
  { value: "TV_OS", label: "tvOS", icon: Icon.Desktop },
  { value: "VISION_OS", label: "visionOS", icon: Icon.Eye },
];

export function selectVersionForPlatform(
  app: ProcessedApp,
  platformFilter: PlatformFilter,
): ProcessedAppVersion | undefined {
  if (platformFilter === "all") return app.versions[0];
  return app.versions.find((v) => v.platform === platformFilter);
}

export default function Command() {
  const [path, setPath] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const { data, isLoading } = useAppStoreConnectApi(
    path,
    (response) => {
      const parsed = appsWithVersionsResponseSchema.safeParse(response);
      if (!parsed.success) {
        return [] as ProcessedApp[];
      }
      return processApps(parsed.data.data, parsed.data.included ?? []);
    },
    true,
  );

  const apps = data ?? [];

  const filteredApps = useMemo(
    () =>
      apps
        .map((app) => ({ app, version: selectVersionForPlatform(app, platformFilter) }))
        .filter(({ version }) => {
          if (!version) return false;
          return statusFilter === "all" || version.state === statusFilter;
        }),
    [apps, statusFilter, platformFilter],
  );

  const pendingReleaseApps = useMemo<PendingRelease[]>(
    () =>
      filteredApps
        .filter(
          (entry): entry is { app: ProcessedApp; version: ProcessedAppVersion } =>
            entry.version?.state === "PENDING_DEVELOPER_RELEASE",
        )
        .map(({ app, version }) => ({ app, version })),
    [filteredApps],
  );

  const statusFilterLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "All Apps";
  const platformLabel = PLATFORM_FILTERS.find((f) => f.value === platformFilter)?.label ?? "All Platforms";
  const hasFilter = statusFilter !== "all" || platformFilter !== "all";
  const searchPlaceholder = hasFilter ? `Search in ${statusFilterLabel}…` : "Search apps…";

  return (
    <SignIn
      didSignIn={() => {
        setPath(
          "/apps?include=appStoreVersions&fields[appStoreVersions]=platform,versionString,appStoreState,releaseType,createdDate&limit=200",
        );
      }}
    >
      <List
        isLoading={isLoading}
        searchBarPlaceholder={searchPlaceholder}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter by Platform"
            value={platformFilter}
            onChange={(newValue) => setPlatformFilter(newValue as PlatformFilter)}
          >
            {PLATFORM_FILTERS.map((filter) => (
              <List.Dropdown.Item key={filter.value} title={filter.label} value={filter.value} icon={filter.icon} />
            ))}
          </List.Dropdown>
        }
      >
        {filteredApps.length === 0 ? (
          <List.EmptyView
            icon={Icon.AppWindow}
            title={hasFilter ? "No Apps Match Filter" : "No Apps Found"}
            description={
              hasFilter
                ? `No apps for status "${statusFilterLabel}" and platform "${platformLabel}".`
                : "No apps were found in your App Store Connect account."
            }
            actions={
              hasFilter ? (
                <ActionPanel>
                  <Action
                    title="Show All Apps"
                    icon={Icon.List}
                    onAction={() => {
                      setStatusFilter("all");
                      setPlatformFilter("all");
                    }}
                  />
                </ActionPanel>
              ) : undefined
            }
          />
        ) : (
          filteredApps.map(({ app, version }) => (
            <AppStatusListItem
              key={app.id}
              app={app}
              version={version}
              pendingReleaseApps={pendingReleaseApps}
              statusFilter={statusFilter}
              onFilterChange={setStatusFilter}
            />
          ))
        )}
      </List>
    </SignIn>
  );
}

function processApps(apps: AppWithVersions[], includedVersions: AppStatusVersion[]): ProcessedApp[] {
  const versionsById = new Map(includedVersions.map((v) => [v.id, v]));

  return apps.map((app) => {
    const versionRelationships = app.relationships.appStoreVersions.data;
    const versions = versionRelationships
      .map((ref) => versionsById.get(ref.id))
      .filter((v): v is AppStatusVersion => v !== undefined)
      .map<ProcessedAppVersion>((v) => ({
        id: v.id,
        versionString: v.attributes.versionString,
        state: v.attributes.appStoreState,
        platform: v.attributes.platform,
        createdDate: v.attributes.createdDate,
        releaseType: v.attributes.releaseType ?? null,
      }))
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());

    return {
      id: app.id,
      name: app.attributes.name,
      bundleId: app.attributes.bundleId,
      versions,
      appStoreConnectUrl: `https://appstoreconnect.apple.com/apps/${app.id}`,
    };
  });
}
