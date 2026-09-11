import { ActionPanel, Action, List, Icon, showToast, Toast, Color, Form, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  getSites,
  purgePageCache,
  purgeObjectCache,
  correctFilePermissions,
  runGitDeployment,
  deleteSite,
} from "./api";
import { Site } from "./types";
import AccountDropdown from "./components/AccountDropdown";

function getStatusIcon(site: Site): { source: Icon; tintColor: Color } {
  if (site.status === "deploying") {
    return { source: Icon.Clock, tintColor: Color.Yellow };
  }
  if (site.status === "failed") {
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
  return { source: Icon.CheckCircle, tintColor: Color.Green };
}

function getUpdatesCount(site: Site): number {
  return (site.wp_core_update ? 1 : 0) + site.wp_theme_updates + site.wp_plugin_updates;
}

async function executeAction(actionName: string, actionFn: () => Promise<{ event_id: number }>) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${actionName}...`,
  });

  try {
    await actionFn();
    toast.style = Toast.Style.Success;
    toast.title = `${actionName} started`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${actionName} failed`;
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

function DeleteSiteForm({ site, onDeleted }: { site: Site; onDeleted: () => void }) {
  const { pop } = useNavigation();
  const [confirmDomain, setConfirmDomain] = useState("");
  const [deleteDatabase, setDeleteDatabase] = useState(false);
  const [deleteBackups, setDeleteBackups] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isValid = confirmDomain === site.domain;

  async function handleDelete() {
    if (!isValid) return;

    setIsDeleting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting site...",
    });

    try {
      await deleteSite(site.id, deleteDatabase, deleteBackups);
      toast.style = Toast.Style.Success;
      toast.title = "Site deletion started";
      pop();
      onDeleted();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Delete site failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
      setIsDeleting(false);
    }
  }

  return (
    <Form
      isLoading={isDeleting}
      actions={
        <ActionPanel>
          <Action title="Delete Site" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleDelete} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Warning"
        text={`You are about to permanently delete "${site.domain}". This action cannot be undone.`}
      />
      <Form.Separator />
      <Form.Checkbox
        id="deleteDatabase"
        label="Delete associated database"
        value={deleteDatabase}
        onChange={setDeleteDatabase}
      />
      <Form.Checkbox
        id="deleteBackups"
        label="Delete associated backups"
        value={deleteBackups}
        onChange={setDeleteBackups}
      />
      <Form.Separator />
      <Form.Description title="Confirm" text={`Type "${site.domain}" to confirm deletion:`} />
      <Form.TextField
        id="confirmDomain"
        placeholder={site.domain}
        value={confirmDomain}
        onChange={setConfirmDomain}
        error={confirmDomain.length > 0 && !isValid ? "Domain does not match" : undefined}
      />
      {!isValid && (
        <Form.Description text="The Delete Site action will be available once you type the correct domain." />
      )}
    </Form>
  );
}

function SiteActions({ site, onDeleted }: { site: Site; onDeleted: () => void }) {
  const isDeployed = site.status === "deployed";
  const hasCacheActions = isDeployed && (site.page_cache.enabled || site.is_wordpress);

  return (
    <ActionPanel>
      {hasCacheActions && (
        <ActionPanel.Section title="Cache Actions">
          {site.page_cache.enabled && (
            <Action
              title="Purge Page Cache"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={() => executeAction("Purge Page Cache", () => purgePageCache(site.id))}
            />
          )}
          {site.is_wordpress && (
            <Action
              title="Purge Object Cache"
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => executeAction("Purge Object Cache", () => purgeObjectCache(site.id))}
            />
          )}
        </ActionPanel.Section>
      )}
      {isDeployed && (
        <ActionPanel.Section title="Maintenance">
          <Action
            title="Correct File Permissions"
            icon={Icon.Lock}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => executeAction("Correct File Permissions", () => correctFilePermissions(site.id))}
          />
          {site.git?.branch && (
            <Action
              title="Run Git Deployment"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={() => executeAction("Run Git Deployment", () => runGitDeployment(site.id))}
            />
          )}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Quick Links">
        <Action.OpenInBrowser
          title="Open Site"
          url={`https://${site.domain}`}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
        <Action.OpenInBrowser
          title="Open in SpinupWP"
          url={`https://spinupwp.app/sites/${site.id}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
        <Action.CopyToClipboard
          title="Copy Domain"
          content={site.domain}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger Zone">
        <Action.Push
          title="Delete Site…"
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          target={<DeleteSiteForm site={site} onDeleted={onDeleted} />}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const { data: sites, isLoading, error, revalidate } = useCachedPromise(getSites);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to load sites",
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sites..."
      searchBarAccessory={<AccountDropdown onAccountChange={revalidate} />}
    >
      <List.EmptyView
        title={error ? "Failed to load sites" : "No sites found"}
        description={error ? error.message : "Add a site in your SpinupWP dashboard"}
        icon={error ? Icon.XMarkCircle : Icon.Globe}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open SpinupWP Dashboard" url="https://spinupwp.app" />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {sites?.map((site) => {
        const updatesCount = getUpdatesCount(site);
        return (
          <List.Item
            key={site.id}
            title={site.domain}
            subtitle={`PHP ${site.php_version}`}
            icon={getStatusIcon(site)}
            accessories={[
              ...(site.https.enabled
                ? [
                    {
                      icon: { source: Icon.Lock, tintColor: Color.Green },
                      tooltip: "HTTPS enabled",
                    },
                  ]
                : []),
              ...(site.page_cache.enabled
                ? [
                    {
                      icon: { source: Icon.Bolt, tintColor: Color.Blue },
                      tooltip: "Page cache enabled",
                    },
                  ]
                : []),
              ...(site.git?.branch
                ? [
                    {
                      icon: { source: Icon.Code, tintColor: Color.Purple },
                      tooltip: `Git: ${site.git.branch}`,
                    },
                  ]
                : []),
              ...(site.basic_auth.enabled
                ? [
                    {
                      icon: { source: Icon.Key, tintColor: Color.Yellow },
                      tooltip: `Basic Auth: ${site.basic_auth.username}`,
                    },
                  ]
                : []),
              ...(updatesCount > 0
                ? [
                    {
                      tag: {
                        value: `${updatesCount} update${updatesCount > 1 ? "s" : ""}`,
                        color: Color.Orange,
                      },
                      tooltip: `${site.wp_core_update ? "Core update available. " : ""}${site.wp_plugin_updates} plugin update${site.wp_plugin_updates !== 1 ? "s" : ""}, ${site.wp_theme_updates} theme update${site.wp_theme_updates !== 1 ? "s" : ""}`,
                    },
                  ]
                : []),
            ]}
            actions={<SiteActions site={site} onDeleted={revalidate} />}
          />
        );
      })}
    </List>
  );
}
