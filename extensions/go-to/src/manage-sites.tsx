import { ActionPanel, Action, Form, List, showToast, Toast, LocalStorage, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

interface Preferences {
  siteMappings: string;
}

interface Site {
  name: string;
  url: string;
}

async function getSites(): Promise<Site[]> {
  try {
    const { siteMappings: preferenceSites } = getPreferenceValues<Preferences>();
    const preferenceMap = JSON.parse(preferenceSites || "{}");

    const localSiteMappings = await LocalStorage.getItem<string>("siteMappings");
    const localMap = JSON.parse(localSiteMappings || "{}");

    const siteMap = { ...preferenceMap, ...localMap };

    return Object.entries(siteMap).map(([name, url]) => ({ name, url: url as string }));
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Invalid site mappings format" });
    return [];
  }
}

function AddSiteForm({ onSiteAdded }: { onSiteAdded: () => void }) {
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; url: string }) {
    try {
      const { siteMappings: preferenceSites } = getPreferenceValues<Preferences>();
      const preferenceMap = JSON.parse(preferenceSites || "{}");

      const localSiteMappings = await LocalStorage.getItem<string>("siteMappings");
      const localMap = JSON.parse(localSiteMappings || "{}");

      if (preferenceMap[values.name] || localMap[values.name]) {
        setNameError("Site with this name already exists");
        return;
      }

      try {
        new URL(values.url);
      } catch {
        setUrlError("Invalid URL format");
        return;
      }

      localMap[values.name] = values.url;
      await LocalStorage.setItem("siteMappings", JSON.stringify(localMap));
      await showToast({ style: Toast.Style.Success, title: "Site added successfully" });
      onSiteAdded();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add site" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Site" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Site Name"
        placeholder="Enter site name"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="Enter site URL"
        error={urlError}
        onChange={() => setUrlError(undefined)}
      />
    </Form>
  );
}

export default function Command() {
  const [sites, setSites] = useState<Site[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    const loadedSites = await getSites();
    setSites(loadedSites);
  };

  const refreshSites = () => {
    loadSites();
  };

  if (isAddingNew) {
    return (
      <AddSiteForm
        onSiteAdded={() => {
          setIsAddingNew(false);
          refreshSites();
        }}
      />
    );
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Add New Site" onAction={() => setIsAddingNew(true)} />
        </ActionPanel>
      }
    >
      {sites.map((site) => (
        <List.Item
          key={site.name}
          title={site.name}
          subtitle={site.url}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={site.url} />
              <Action
                title="Delete Site"
                onAction={async () => {
                  try {
                    const siteMappings = await LocalStorage.getItem<string>("siteMappings");
                    const sites = JSON.parse(siteMappings || "{}");
                    delete sites[site.name];
                    await LocalStorage.setItem("siteMappings", JSON.stringify(sites));
                    refreshSites();
                    await showToast({ style: Toast.Style.Success, title: "Site deleted successfully" });
                  } catch (error) {
                    await showToast({ style: Toast.Style.Failure, title: "Failed to delete site" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
