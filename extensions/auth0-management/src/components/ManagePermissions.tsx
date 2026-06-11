import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { getResourceServer, updateResourceServerScopes, getAuth0ErrorMessage } from "../utils/auth0-client";
import { ResourceServer, Tenant } from "../utils/types";
import PermissionForm from "./PermissionForm";

interface ManagePermissionsProps {
  api: ResourceServer;
  tenant: Tenant;
}

/** List and manage scopes (permissions) on an Auth0 API (resource server). */
export default function ManagePermissions({ api, tenant }: ManagePermissionsProps) {
  const [searchText, setSearchText] = useState("");
  const [scopes, setScopes] = useState<Array<{ value: string; description?: string }>>(api.scopes ?? []);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const fresh = await getResourceServer(tenant, api.id);
      setScopes(fresh.scopes ?? []);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Refresh Failed",
        message: getAuth0ErrorMessage(err, "read:resource_servers"),
      });
    } finally {
      setIsLoading(false);
    }
  }, [tenant, api.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = useCallback(
    async (newScope: { value: string; description?: string }) => {
      const exists = scopes.some((s) => s.value === newScope.value);
      if (exists) {
        showToast({
          style: Toast.Style.Failure,
          title: "Duplicate Scope",
          message: `"${newScope.value}" already exists`,
        });
        return;
      }
      try {
        await showToast({ style: Toast.Style.Animated, title: "Adding permission…" });
        const updated = [...scopes, newScope];
        await updateResourceServerScopes(tenant, api.id, updated);
        await showToast({ style: Toast.Style.Success, title: "Permission Added", message: newScope.value });
        await refresh();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Add Failed",
          message: getAuth0ErrorMessage(err, "update:resource_servers"),
        });
      }
    },
    [scopes, tenant, api.id, refresh],
  );

  const handleEdit = useCallback(
    async (original: { value: string; description?: string }, edited: { value: string; description?: string }) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Updating permission…" });
        const updated = scopes.map((s) => (s.value === original.value ? { ...s, description: edited.description } : s));
        await updateResourceServerScopes(tenant, api.id, updated);
        await showToast({ style: Toast.Style.Success, title: "Permission Updated", message: original.value });
        await refresh();
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Update Failed",
          message: getAuth0ErrorMessage(err, "update:resource_servers"),
        });
      }
    },
    [scopes, tenant, api.id, refresh],
  );

  const filtered = scopes.filter((s) => {
    if (!searchText) return true;
    const term = searchText.toLowerCase();
    return s.value.toLowerCase().includes(term) || (s.description?.toLowerCase().includes(term) ?? false);
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter permissions…"
      navigationTitle={`Permissions — ${api.name ?? "API"}`}
    >
      {filtered.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Key}
          title="No Permissions"
          description={searchText ? "No permissions match your filter" : "This API has no scopes defined"}
          actions={
            <ActionPanel>
              <Action.Push title="Add Permission" icon={Icon.Plus} target={<PermissionForm onSubmit={handleAdd} />} />
            </ActionPanel>
          }
        />
      )}
      {filtered.map((scope) => (
        <List.Item
          key={scope.value}
          icon={Icon.Key}
          title={scope.value}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Scope" text={scope.value} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Description" text={scope.description || "No description"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Permission"
                icon={Icon.Pencil}
                target={<PermissionForm scope={scope} onSubmit={(edited) => handleEdit(scope, edited)} />}
              />
              <Action.Push
                title="Add Permission"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<PermissionForm onSubmit={handleAdd} />}
              />
              <Action.CopyToClipboard
                title="Copy Scope Value"
                content={scope.value}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
