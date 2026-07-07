import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import {
  listOrgs,
  openOrg,
  openOrgToPage,
  logoutOrg,
  addToRecentOrgs,
  getRecentOrgs,
  getAllOrgMetadata,
  getScratchOrgExpiration,
  setAsDefaultOrg,
  SalesforceOrg,
  OrgMetadata,
} from "./lib/sfdx";
import { EditOrgForm } from "./edit-org";
import AddOrgForm from "./add-org";
import { OrgDetailsView } from "./org-details";
import { SoqlForm } from "./run-soql";

interface EnrichedOrg extends SalesforceOrg {
  metadata?: OrgMetadata;
  expirationDate?: Date | null;
  daysUntilExpiration?: number | null;
}

const SCRATCH_EXPIRATIONS_KEY = "scratch-expirations";

export default function Command() {
  const [recentOrgUsernames, setRecentOrgUsernames] = useState<string[]>([]);
  const [orgMetadata, setOrgMetadata] = useState<Record<string, OrgMetadata>>({});
  const [expirations, setExpirations] = useState<Record<string, Date | null>>({});

  const { data: orgs, isLoading, revalidate } = useCachedPromise(listOrgs, [], { keepPreviousData: true });

  // Load recent orgs and metadata on mount
  useEffect(() => {
    async function loadData() {
      const recent = await getRecentOrgs();
      setRecentOrgUsernames(recent);

      const metadata = await getAllOrgMetadata();
      setOrgMetadata(metadata);
    }
    loadData();
  }, []);

  // Derive the enriched, sorted list synchronously so the first paint is already
  // fully sorted/sectioned - metadata is local and instant. Expiration dates
  // arrive later via a separate effect and are merged in from `expirations`.
  const enrichedOrgs: EnrichedOrg[] = useMemo(() => {
    if (!orgs) return [];

    return orgs.map((org) => {
      const metadata = orgMetadata[org.username];
      const expirationDate = expirations[org.username] ?? null;
      const daysUntilExpiration = expirationDate
        ? Math.floor((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return { ...org, metadata, expirationDate, daysUntilExpiration };
    });
  }, [orgs, orgMetadata, expirations]);

  // Load scratch org expiration dates - cached in LocalStorage since expiration
  // never changes, so we only ever fetch it once per org.
  useEffect(() => {
    async function loadExpirations() {
      if (!orgs) return;

      const scratchUsernames = orgs
        .filter((org) => orgMetadata[org.username]?.section === "Scratch Orgs")
        .map((org) => org.username);
      if (scratchUsernames.length === 0) return;

      const cachedRaw = await LocalStorage.getItem<string>(SCRATCH_EXPIRATIONS_KEY);
      const cached: Record<string, string | null> = cachedRaw ? JSON.parse(cachedRaw) : {};

      // A lookup can fail transiently, so only real dates are cached - a null
      // result is retried on the next launch instead of being stored forever.
      const missing = scratchUsernames.filter((username) => !cached[username]);
      const fetched: Record<string, string> = {};
      await Promise.all(
        missing.map(async (username) => {
          const date = await getScratchOrgExpiration(username);
          if (date) fetched[username] = date.toISOString();
        }),
      );

      if (Object.keys(fetched).length > 0) {
        await LocalStorage.setItem(SCRATCH_EXPIRATIONS_KEY, JSON.stringify({ ...cached, ...fetched }));
      }

      const merged = { ...cached, ...fetched };
      const parsed: Record<string, Date | null> = {};
      for (const username of scratchUsernames) {
        const iso = merged[username];
        parsed[username] = iso ? new Date(iso) : null;
      }

      setExpirations((prev) => ({ ...prev, ...parsed }));
    }

    loadExpirations();
  }, [orgs, orgMetadata]);

  // Handle opening an org - respects "Open To" preference
  const handleOpenOrg = async (org: EnrichedOrg, page?: "home" | "setup" | "developer-console" | "custom") => {
    const orgIdentifier = org.alias || org.username;

    await showToast({ style: Toast.Style.Animated, title: "Opening org…" });

    try {
      // Determine which page to open
      let targetPage = page;

      // If no page specified, use the org's "Open To" preference
      if (!targetPage && org.metadata?.openTo) {
        targetPage = org.metadata.openTo as "home" | "setup" | "developer-console" | "custom";
      }

      // Handle custom path
      if (targetPage === "custom" && org.metadata?.customPath) {
        await openOrgToPage(orgIdentifier, "custom", org.metadata.customPath);
      } else if (targetPage && targetPage !== "custom") {
        await openOrgToPage(orgIdentifier, targetPage);
      } else {
        // Default: just open the org
        await openOrg(orgIdentifier);
      }

      // Track as recently used
      await addToRecentOrgs(org.username);
      const updated = await getRecentOrgs();
      setRecentOrgUsernames(updated);

      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open org",
        message: String(error),
      });
    }
  };

  // Handle logout
  const handleLogout = async (org: EnrichedOrg) => {
    const displayName = org.metadata?.label || org.alias || org.username;

    const confirmed = await confirmAlert({
      title: "Logout from Org",
      message: `Are you sure you want to logout from ${displayName}?`,
      primaryAction: {
        title: "Logout",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await showToast({ style: Toast.Style.Animated, title: "Logging out..." });
      try {
        await logoutOrg(org.alias || org.username);
        await showToast({ style: Toast.Style.Success, title: "Logged out successfully" });
        revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to logout",
          message: String(error),
        });
      }
    }
  };

  // Handle setting as default
  const handleSetDefault = async (org: EnrichedOrg) => {
    await showToast({ style: Toast.Style.Animated, title: "Setting as default..." });

    try {
      await setAsDefaultOrg(org.username);

      // Refresh the list to update the Green Badge
      revalidate();

      await showToast({
        style: Toast.Style.Success,
        title: "Default Org Updated",
        message: `${org.alias || org.username} is now the default.`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to set default",
        message: String(error),
      });
    }
  };

  // Handle metadata refresh
  const handleMetadataRefresh = async () => {
    const metadata = await getAllOrgMetadata();
    setOrgMetadata(metadata);
    revalidate();
  };

  // Get display name for org
  const getDisplayName = (org: EnrichedOrg) => {
    return org.metadata?.label || org.alias || org.username;
  };

  // Get icon color from metadata - returns hex string
  const getIconColor = (org: EnrichedOrg): string => {
    if (org.metadata?.color) {
      return org.metadata.color;
    }
    return "#0000FF";
  };

  // Organize orgs by section
  const organizeOrgs = () => {
    const sections: Record<string, EnrichedOrg[]> = {};

    // Separate recent orgs
    const recentOrgs = enrichedOrgs.filter((org) => recentOrgUsernames.includes(org.username));
    const otherOrgs = enrichedOrgs.filter((org) => !recentOrgUsernames.includes(org.username));

    // Sort recent orgs by recency
    recentOrgs.sort((a, b) => {
      return recentOrgUsernames.indexOf(a.username) - recentOrgUsernames.indexOf(b.username);
    });

    if (recentOrgs.length > 0) {
      sections["Recently Used"] = recentOrgs;
    }

    // Group other orgs by section
    otherOrgs.forEach((org) => {
      const sectionName = org.metadata?.section || "Miscellaneous Orgs";
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      sections[sectionName].push(org);
    });

    return sections;
  };

  const renderOrgItem = (org: EnrichedOrg) => {
    const displayName = getDisplayName(org);
    const iconColor = getIconColor(org);

    // Build accessories
    const accessories: List.Item.Accessory[] = [];

    // Expiration warning for scratch orgs
    if (org.daysUntilExpiration !== null && org.daysUntilExpiration !== undefined) {
      if (org.daysUntilExpiration < 0) {
        accessories.push({
          tag: { value: "Expired", color: Color.Red },
        });
      } else if (org.daysUntilExpiration <= 7) {
        accessories.push({
          tag: { value: `Expires in ${org.daysUntilExpiration}d`, color: Color.Red },
        });
      } else {
        accessories.push({
          tag: { value: `${org.daysUntilExpiration}d left`, color: Color.Orange },
        });
      }
    }

    // Default org indicator
    if (org.isDefaultUsername) {
      accessories.push({ tag: { value: "Default", color: Color.Green } });
    }

    // Instance name
    const instanceName = org.instanceUrl?.replace("https://", "").split(".")[0];
    if (instanceName) {
      accessories.push({ text: instanceName });
    }

    return (
      <List.Item
        key={org.username}
        icon={{ source: Icon.Cloud, tintColor: iconColor }}
        title={displayName}
        subtitle={org.username !== displayName ? org.username : undefined}
        keywords={[org.username, org.alias, org.metadata?.section].filter((v): v is string => Boolean(v))}
        accessories={accessories}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="Open">
              <Action title="Open" icon={Icon.Globe} onAction={() => handleOpenOrg(org)} />
              <Action
                title="Open Home"
                icon={Icon.House}
                shortcut={{ modifiers: ["cmd"], key: "h" }}
                onAction={() => handleOpenOrg(org, "home")}
              />
              <Action
                title="Open Setup"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => handleOpenOrg(org, "setup")}
              />
              <Action
                title="Open Developer Console"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => handleOpenOrg(org, "developer-console")}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard
                title="Copy Username"
                content={org.username}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Org Id"
                content={org.orgId}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Instance URL"
                content={org.instanceUrl}
                shortcut={{ modifiers: ["opt"], key: "c" }}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Tools">
              <Action.Push
                title="View Org Details"
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                target={<OrgDetailsView username={org.alias || org.username} />}
              />
              <Action.Push
                title="Run Query"
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd"], key: "q" }}
                target={<SoqlForm initialOrg={org.alias || org.username} />}
              />
            </ActionPanel.Section>

            <ActionPanel.Section title="Manage">
              {!org.isDefaultUsername && (
                <Action
                  title="Set as Default Org"
                  icon={Icon.CheckCircle}
                  shortcut={{ modifiers: ["ctrl"], key: "d" }}
                  onAction={() => handleSetDefault(org)}
                />
              )}

              <Action.Push
                title="Edit"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditOrgForm org={org} onSave={handleMetadataRefresh} />}
              />
              <Action.Push
                title="Add New Org"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                target={<AddOrgForm onOrgAdded={() => revalidate()} />}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
              <Action
                title="Logout"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => handleLogout(org)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const sections = organizeOrgs();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search orgs...">
      {Object.entries(sections).map(([sectionName, sectionOrgs]) => (
        <List.Section key={sectionName} title={sectionName}>
          {sectionOrgs.map(renderOrgItem)}
        </List.Section>
      ))}

      {!isLoading && enrichedOrgs.length === 0 && (
        <List.EmptyView
          icon={Icon.Cloud}
          title="No Orgs Found"
          description="Authenticate to a Salesforce org using SF CLI first"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add New Org"
                icon={Icon.Plus}
                target={<AddOrgForm onOrgAdded={() => revalidate()} />}
              />
              <Action
                title="Refresh List"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
