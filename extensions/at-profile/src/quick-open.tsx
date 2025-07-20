import { ActionPanel, Action, List, Form, showToast, Toast, open, popToRoot, Icon, LocalStorage } from "@raycast/api";
import { getAllSites } from "./sites";
import { addUsername, getUsernameHistory } from "./storage";
import { useEffect, useState, useCallback } from "react";
import { useCachedState } from "@raycast/utils";

interface Site {
  name: string;
  value: string;
  urlTemplate: string;
}

interface HistoryItem {
  username: string;
  site: string;
  siteName: string;
}

export default function QuickOpenCommand() {
  const [searchText, setSearchText] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [usernameHistory, setUsernameHistory] = useCachedState<string[]>("username-history", []);
  const [combinedHistory, setCombinedHistory] = useState<HistoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [lastPlatformUpdate, setLastPlatformUpdate] = useState<string>("");

  const loadSites = useCallback(async () => {
    setIsLoadingSites(true);
    try {
      const allSites = await getAllSites();
      setSites(allSites);
      // Set default platform to first enabled site
      if (allSites.length > 0 && !selectedPlatform) {
        setSelectedPlatform(allSites[0].value);
      }
    } catch (error) {
      console.error("Error loading sites:", error);
    } finally {
      setIsLoadingSites(false);
    }
  }, [selectedPlatform]);

  useEffect(() => {
    async function loadData() {
      const [allSites, history] = await Promise.all([getAllSites(), getUsernameHistory()]);
      setSites(allSites);
      setUsernameHistory(history);
      // Set default platform to first enabled site
      if (allSites.length > 0 && !selectedPlatform) {
        setSelectedPlatform(allSites[0].value);
      }

      // Create combined history with recent username/site combinations
      const combined: HistoryItem[] = [];
      for (const username of history.slice(0, 10)) {
        for (const site of allSites.slice(0, 3)) {
          // Show top 3 platforms for each username
          combined.push({
            username,
            site: site.value,
            siteName: site.name,
          });
        }
      }
      setCombinedHistory(combined);
    }
    loadData();
  }, []);

  // Reload sites when platform manager makes changes
  useEffect(() => {
    loadSites();
  }, [loadSites]);

  // Monitor for platform changes and refresh data when needed
  useEffect(() => {
    const checkForPlatformUpdates = async () => {
      try {
        // Create a simple timestamp-based cache key for platform updates
        const platformSettingsStr = await LocalStorage.getItem<string>("platformSettings");
        const customPlatformsStr = await LocalStorage.getItem<string>("customPlatforms");
        const currentHash = `${platformSettingsStr || ""}-${customPlatformsStr || ""}`;

        if (lastPlatformUpdate && currentHash !== lastPlatformUpdate) {
          // Platform data changed, reload sites
          await loadSites();
          // Reload the full data including history combinations
          const [allSites, history] = await Promise.all([getAllSites(), getUsernameHistory()]);
          setSites(allSites);
          setUsernameHistory(history);

          // Update combined history with new sites data
          const combined: HistoryItem[] = [];
          for (const username of history.slice(0, 10)) {
            for (const site of allSites.slice(0, 3)) {
              combined.push({
                username,
                site: site.value,
                siteName: site.name,
              });
            }
          }
          setCombinedHistory(combined);

          await showToast({
            style: Toast.Style.Success,
            title: "Platforms Updated",
            message: "Available platforms have been refreshed",
          });
        }

        setLastPlatformUpdate(currentHash);
      } catch (error) {
        console.error("Error checking for platform updates:", error);
      }
    };

    // Check every 2 seconds for changes
    const interval = setInterval(checkForPlatformUpdates, 2000);

    // Initial check
    checkForPlatformUpdates();

    return () => clearInterval(interval);
  }, [lastPlatformUpdate, loadSites, setUsernameHistory]);

  const openProfile = async (username: string, siteValue: string) => {
    try {
      const selectedSite = sites.find((s) => s.value === siteValue);
      if (!selectedSite) {
        throw new Error(`Site "${siteValue}" not found`);
      }

      // Normalize profile (remove leading @ if present)
      const normalizedProfile = username.startsWith("@") ? username.slice(1) : username;

      const url = selectedSite.urlTemplate.replace("{profile}", normalizedProfile);
      await open(url);

      // Add username to history after successful open
      await addUsername(normalizedProfile);

      await showToast({
        style: Toast.Style.Success,
        title: "Profile opened",
        message: `Opened ${normalizedProfile} on ${selectedSite.name}`,
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open profile",
        message: (error as Error).message,
      });
    }
  };

  const handleFormSubmit = async (values: { username: string; platform: string }) => {
    if (!values.username.trim() || !values.platform) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Please enter a username and select a platform",
      });
      return;
    }
    await openProfile(values.username, values.platform);
  };

  const filteredHistory = combinedHistory.filter(
    (item) =>
      item.username.toLowerCase().includes(searchText.toLowerCase()) ||
      item.siteName.toLowerCase().includes(searchText.toLowerCase()),
  );

  const profileName = searchText.startsWith("@") ? searchText.slice(1) : searchText;

  if (showForm) {
    return (
      <Form
        isLoading={isLoadingSites}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Open Profile" icon={Icon.Globe} onSubmit={handleFormSubmit} />
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={() => setShowForm(false)} />
            <Action title="Refresh Platforms" icon={Icon.RotateClockwise} onAction={loadSites} />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="username"
          title="Username"
          placeholder="Enter username (with or without @)"
          value={username}
          onChange={setUsername}
          info="The username or profile name to open (@ symbol is optional)"
        />
        <Form.Dropdown
          id="platform"
          title="Platform"
          value={selectedPlatform}
          onChange={setSelectedPlatform}
          info="Select the social platform where you want to open the profile"
        >
          {sites.map((site) => {
            // Use platform-specific icons where available
            let platformIcon = Icon.Globe;
            switch (site.value.toLowerCase()) {
              case "github":
                platformIcon = Icon.Code;
                break;
              case "x":
              case "twitter":
                platformIcon = Icon.Message;
                break;
              case "instagram":
                platformIcon = Icon.Camera;
                break;
              case "youtube":
                platformIcon = Icon.Video;
                break;
              case "linkedin":
                platformIcon = Icon.Person;
                break;
              case "reddit":
                platformIcon = Icon.SpeechBubble;
                break;
              case "raycast":
                platformIcon = Icon.RaycastLogoPos;
                break;
              case "facebook":
                platformIcon = Icon.PersonLines;
                break;
              case "threads":
                platformIcon = Icon.AtSymbol;
                break;
              case "tiktok":
                platformIcon = Icon.Music;
                break;
              default:
                platformIcon = Icon.Globe;
            }

            return <Form.Dropdown.Item key={site.value} value={site.value} title={site.name} icon={platformIcon} />;
          })}
        </Form.Dropdown>
        <Form.Separator />
        <Form.Description
          title="Enabled Platforms Only"
          text={`Showing ${sites.length} enabled platform${sites.length === 1 ? "" : "s"}. Use "Manage Platforms" to enable/disable platforms or add custom ones.`}
        />
      </Form>
    );
  }

  return (
    <List
      isLoading={sites.length === 0}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search profiles or enter new username..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Quick Actions"
          onChange={(newValue) => {
            if (newValue === "form") {
              setShowForm(true);
            }
          }}
        >
          <List.Dropdown.Item title="List View" value="list" />
          <List.Dropdown.Item title="Form View" value="form" />
        </List.Dropdown>
      }
    >
      {searchText.trim() && (
        <List.Section title="Open New Profile">
          {sites.map((site) => (
            <List.Item
              key={`new-${site.value}`}
              title={`${profileName} on ${site.name}`}
              subtitle={`Open @${profileName} profile`}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action title={`Open on ${site.name}`} onAction={() => openProfile(profileName, site.value)} />
                  <ActionPanel.Section>
                    <Action
                      title="Switch to Form View"
                      icon={Icon.List}
                      onAction={() => {
                        setShowForm(true);
                        setUsername(profileName);
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {filteredHistory.length > 0 && (
        <List.Section title="Recent Profiles">
          {filteredHistory.slice(0, 10).map((item, index) => (
            <List.Item
              key={`history-${item.username}-${item.site}-${index}`}
              title={`${item.username} on ${item.siteName}`}
              subtitle={`Previously opened profile`}
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action title={`Open on ${item.siteName}`} onAction={() => openProfile(item.username, item.site)} />
                  <ActionPanel.Section>
                    <Action
                      title="Switch to Form View"
                      icon={Icon.List}
                      onAction={() => {
                        setShowForm(true);
                        setUsername(item.username);
                        setSelectedPlatform(item.site);
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!searchText.trim() && !filteredHistory.length && usernameHistory.length === 0 && (
        <List.EmptyView
          title="No Profile History"
          description="Start typing a username to open a profile. After opening profiles, they'll appear here for quick access."
          icon={Icon.PersonLines}
          actions={
            <ActionPanel>
              <Action title="Switch to Form View" icon={Icon.List} onAction={() => setShowForm(true)} />
            </ActionPanel>
          }
        />
      )}

      {!searchText.trim() && usernameHistory.length > 0 && (
        <List.Section title="All Platforms">
          {sites.map((site) => (
            <List.Item
              key={`platform-${site.value}`}
              title={site.name}
              subtitle={`Open any profile on ${site.name}`}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action
                    title={`Browse ${site.name}`}
                    onAction={() => {
                      setSearchText("");
                    }}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Switch to Form View"
                      icon={Icon.List}
                      onAction={() => {
                        setShowForm(true);
                        setSelectedPlatform(site.value);
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
