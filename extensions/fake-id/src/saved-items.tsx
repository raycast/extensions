import {
  List,
  ActionPanel,
  Action,
  Detail,
  Icon,
  showToast,
  Toast,
  Clipboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getSavedIdentities,
  deleteIdentity,
  type SavedIdentity,
} from "./utils/storage";

export default function Command() {
  const [items, setItems] = useState<SavedIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadItems() {
    setIsLoading(true);
    const saved = await getSavedIdentities();
    setItems(saved);
    setIsLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleDelete(id: string) {
    const confirmed = await confirmAlert({
      title: "Delete Identity",
      message: "Are you sure you want to delete this identity?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deleteIdentity(id);
    await loadItems();
    showToast(Toast.Style.Success, "Identity deleted");
  }

  function formatAllText(item: SavedIdentity): string {
    return [
      `Name: ${item.fullName}`,
      `Gender: ${item.gender}`,
      `DOB: ${item.dateOfBirth}`,
      `SSN: ${item.ssn}`,
      `Phone: ${item.phone}`,
      `Email: ${item.email}`,
      `Address: ${item.street}, ${item.city}, ${item.stateAbbr} ${item.zipCode}`,
    ].join("\n");
  }

  if (items.length === 0 && !isLoading) {
    return (
      <Detail markdown="# No Saved Identities\n\nGenerate and save identities from the **Generate Identity** command." />
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={Icon.Person}
          title={item.fullName}
          subtitle={`${item.stateAbbr} • ${item.ssn}`}
          accessories={[
            {
              text: new Date(item.createdAt).toLocaleDateString(),
              tooltip: "Saved on",
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={[
                `## ${item.fullName}`,
                `**SSN:** ${item.ssn}`,
                `**DOB:** ${item.dateOfBirth} (${item.gender})`,
                `**Phone:** ${item.phone}`,
                `**Email:** ${item.email}`,
                `---`,
                `**Street:** ${item.street}`,
                `**City:** ${item.city}`,
                `**State:** ${item.state} (${item.stateAbbr})`,
                `**ZIP:** ${item.zipCode}`,
                `---`,
                `_Saved: ${new Date(item.createdAt).toLocaleString()}_`,
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Copy All"
                icon={Icon.Clipboard}
                onAction={() => {
                  Clipboard.copy(formatAllText(item));
                  showToast(Toast.Style.Success, "All info copied");
                }}
              />
              <Action
                title="Copy Name"
                icon={Icon.CopyClipboard}
                onAction={() => {
                  Clipboard.copy(item.fullName);
                  showToast(Toast.Style.Success, "Name copied");
                }}
              />
              <Action
                title="Copy SSN"
                icon={Icon.CopyClipboard}
                onAction={() => {
                  Clipboard.copy(item.ssn);
                  showToast(Toast.Style.Success, "SSN copied");
                }}
              />
              <Action
                title="Copy Address"
                icon={Icon.CopyClipboard}
                onAction={() => {
                  Clipboard.copy(
                    `${item.street}, ${item.city}, ${item.stateAbbr} ${item.zipCode}`,
                  );
                  showToast(Toast.Style.Success, "Address copied");
                }}
              />
              <Action
                title="Copy Phone"
                icon={Icon.CopyClipboard}
                onAction={() => {
                  Clipboard.copy(item.phone);
                  showToast(Toast.Style.Success, "Phone copied");
                }}
              />
              <Action
                title="Copy Email"
                icon={Icon.CopyClipboard}
                onAction={() => {
                  Clipboard.copy(item.email);
                  showToast(Toast.Style.Success, "Email copied");
                }}
              />
              <Action
                title="Delete Identity"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
                onAction={() => handleDelete(item.id)}
              />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadItems}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
