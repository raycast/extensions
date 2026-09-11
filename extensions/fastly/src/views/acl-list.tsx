import { List, ActionPanel, Action, Icon, showToast, Toast, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { ComputeACL } from "../types";
import { getComputeACLs, deleteComputeACL } from "../api";
import { ACLEntries } from "./acl-entries";
import { ACLEntryForm } from "./acl-entry-form";

export function ACLList() {
  const [acls, setACLs] = useState<ComputeACL[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadACLs();
  }, []);

  async function loadACLs() {
    try {
      setIsLoading(true);
      const response = await getComputeACLs();
      setACLs(response.data);
    } catch (error) {
      console.error("Error loading ACLs:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load ACLs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteACL(acl: ComputeACL) {
    if (
      await confirmAlert({
        title: "Delete ACL",
        message: `Are you sure you want to delete "${acl.name}"? This will permanently remove the ACL and all its entries.`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await deleteComputeACL(acl.id);
        await showToast({ style: Toast.Style.Success, title: "ACL deleted", message: acl.name });
        await loadACLs();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete ACL",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search ACLs by name...">
      {acls.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No ACLs Found"
          description="Your account doesn't have any ACLs yet."
          icon={Icon.Shield}
        />
      ) : (
        acls.map((acl) => (
          <List.Item
            key={acl.id}
            title={acl.name}
            subtitle={acl.id}
            icon={Icon.Shield}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push title="View Entries" target={<ACLEntries acl={acl} />} icon={Icon.List} />
                  <Action.Push
                    title="Quick Add IP"
                    target={<ACLEntryForm aclId={acl.id} aclName={acl.name} />}
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy ACL ID"
                    content={acl.id}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "c" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "c" },
                    }}
                  />
                  <Action.CopyToClipboard title="Copy ACL Name" content={acl.name} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Danger Zone">
                  <Action
                    title="Delete ACL"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteACL(acl)}
                    shortcut={{
                      macOS: { modifiers: ["ctrl"], key: "x" },
                      Windows: { modifiers: ["ctrl"], key: "x" },
                    }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Quick Access">
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    onAction={loadACLs}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
