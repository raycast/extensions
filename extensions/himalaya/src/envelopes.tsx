import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, List, Detail, confirmAlert, Color, useNavigation, Alert } from "@raycast/api";
import { Envelope, Flags, Folder } from "./models";
import { execa } from "execa";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./preferences";
import {
  deleteEnvelopeAndRefresh,
  loadEnvelopesFromStorage,
  loadFoldersFromStorage,
  moveEnvelopeAndRefresh,
} from "./control";

// Format date for display
const formatDate = (dateString: string) => {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch {
    return dateString;
  }
};

// Format date for section title
const formatDateForSection = (dateString: string) => {
  if (!dateString) return "Unknown Date";

  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }
  } catch {
    return dateString;
  }
};

// Component to display message details with body fetched from Himalaya CLI
function MessageDetail({ envelope, onDelete }: { envelope: Envelope; onDelete: () => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [messageBody, setMessageBody] = useState<string>("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  useEffect(() => {
    fetchMessageBody();
    loadFoldersFromStorage().then((data) => {
      setFolders(data.folders);
    });
  }, [envelope.id]);

  async function fetchMessageBody() {
    try {
      setIsLoading(true);

      // Execute CLI command to get message body
      const result = await execa(
        preferences.binaryPath,
        ["message", "read", "--no-headers", envelope.id, "--account", preferences.defaultAccount],
        {},
      );

      setMessageBody(result.stdout);
    } catch (error) {
      console.error("Error fetching message body:", error);
      setMessageBody("Error loading message body.");
    } finally {
      setIsLoading(false);
    }
  }

  // Construct markdown for message display
  const markdown = `
# ${envelope.subject || "(No Subject)"}

**From:** ${envelope.from?.name || envelope.from?.addr || "Unknown"}

**To:** ${envelope.to?.name || envelope.to?.addr || "Unknown"}

**Date:** ${formatDate(envelope.date || "")}

${envelope.folder_name ? `**Folder:** ${envelope.folder_name}` : ""}

---

${messageBody}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={envelope.subject || "(No Subject)"}
      actions={
        <ActionPanel>
          <Action
            title="Delete Email"
            icon={{ source: Icon.Trash, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={() => {
              const prefs = getPreferenceValues<Preferences>();
              deleteEnvelopeAndRefresh(envelope.id, prefs, () => {
                // Call the onDelete callback to refresh the list
                onDelete();
                // Pop back to the list view
                pop();
              });
            }}
          />
          <Action.Push
            title="Move Email"
            icon={{ source: Icon.Folder }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            target={
              <List navigationTitle="Move Email" searchBarPlaceholder="Search folders">
                {folders.map((folder) => (
                  <List.Item
                    key={folder.name}
                    title={folder.name}
                    icon={
                      folder.desc.includes("\\Inbox")
                        ? Icon.Envelope
                        : folder.desc.includes("\\Sent")
                          ? Icon.Airplane
                          : folder.desc.includes("\\Trash")
                            ? Icon.Trash
                            : folder.desc.includes("\\Draft")
                              ? Icon.Pencil
                              : Icon.Folder
                    }
                    accessories={[
                      {
                        text: folder.desc,
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Move to This Folder"
                          icon={{ source: Icon.Folder }}
                          onAction={() => {
                            const prefs = getPreferenceValues<Preferences>();
                            moveEnvelopeAndRefresh(envelope.id, folder.name, prefs, () => {
                              // Call the onDelete callback to refresh the list
                              onDelete();
                              // Pop back to the list view (this will pop the folder selection view)
                              pop();
                              // Pop one more time to go back to the envelope list (if we're in the detail view)
                              pop();
                            });
                          }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List>
            }
          />
          <Action.CopyToClipboard title="Copy Subject" content={envelope.subject || "(No Subject)"} />
          <Action.CopyToClipboard title="Copy ID" content={envelope.id} />
          <Action.CopyToClipboard
            title="Copy Sender"
            content={envelope.from?.name || envelope.from?.addr || "Unknown"}
          />
        </ActionPanel>
      }
    />
  );
}

// Component to display a list of envelopes
export default function EnvelopeList() {
  const [isLoading, setIsLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState<string>("INBOX");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();

  useEffect(() => {
    Promise.all([loadEnvelopesFromStorage(), loadFoldersFromStorage()]).then(([envelopeData, folderData]) => {
      setEnvelopes(envelopeData.envelopes);
      setFolders(folderData.folders);
      setLastSync(envelopeData.lastSync);
      setIsLoading(false);
    });
  }, []);

  // Filter envelopes by selected folder
  const filteredEnvelopes =
    selectedFolderName === "all"
      ? envelopes
      : envelopes.filter((envelope) => {
          if (envelope.folder_name) {
            return envelope.folder_name === selectedFolderName;
          }

          return false;
        });

  // Get flag icons
  const getFlagIcons = (flags: string[]) => {
    const flagIcons: { icon: { source: Icon; tintColor?: Color }; tooltip: string; text?: string }[] = [];

    if (flags.includes(Flags.Flagged)) {
      flagIcons.push({
        icon: { source: Icon.Flag, tintColor: Color.Red },
        tooltip: "Flagged",
      });
    }

    if (flags.includes(Flags.Answered)) {
      flagIcons.push({
        icon: { source: Icon.Reply },
        tooltip: "Replied",
      });
    }

    if (flags.includes(Flags.Draft)) {
      flagIcons.push({
        icon: { source: Icon.Pencil },
        tooltip: "Draft",
      });
    }

    return flagIcons;
  };

  // Handle deletion from the list view
  const handleDelete = async (id: string) => {
    if (
      await confirmAlert({
        title: "Delete Email",
        message: "Are you sure you want to delete this email?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      // Perform the deletion and update UI only after CLI deletion succeeds
      deleteEnvelopeAndRefresh(id, preferences, () => {
        // Update local state from localStorage after successful deletion
        loadEnvelopesFromStorage().then((data) => {
          setEnvelopes(data.envelopes);
          setLastSync(data.lastSync);
        });
      });
    }
  };

  // Group envelopes by date
  const groupedEnvelopes = filteredEnvelopes.reduce<Record<string, Envelope[]>>((acc, envelope) => {
    if (!envelope.date) {
      if (!acc["Unknown"]) {
        acc["Unknown"] = [];
      }
      acc["Unknown"].push(envelope);
      return acc;
    }

    const dateKey = new Date(envelope.date).toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(envelope);
    return acc;
  }, {});

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedEnvelopes).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Sort envelopes within each date group by time (newest first)
  for (const dateKey of sortedDates) {
    groupedEnvelopes[dateKey].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Email Envelopes"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by folder"
          defaultValue={preferences.defaultFolder}
          onChange={(newValue) => {
            setSelectedFolderName(newValue);
          }}
        >
          <List.Dropdown.Item title="All Folders" value="all" />
          {folders.map((folder) => (
            <List.Dropdown.Item
              key={folder.name}
              title={folder.name}
              value={folder.name}
              icon={
                folder.desc.includes("\\Inbox")
                  ? Icon.Envelope
                  : folder.desc.includes("\\Sent")
                    ? Icon.Airplane
                    : folder.desc.includes("\\Trash")
                      ? Icon.Trash
                      : folder.desc.includes("\\Draft")
                        ? Icon.Pencil
                        : Icon.Folder
              }
            />
          ))}
        </List.Dropdown>
      }
    >
      {sortedDates.map((dateKey, index) => (
        <List.Section
          key={dateKey}
          title={formatDateForSection(dateKey)}
          subtitle={index === 0 && lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : undefined}
        >
          {groupedEnvelopes[dateKey].map((envelope) => (
            <List.Item
              key={envelope.id}
              icon={
                envelope.flags?.includes(Flags.Seen)
                  ? { source: Icon.CircleProgress100, tintColor: Color.SecondaryText }
                  : { source: Icon.Circle, tintColor: Color.Blue }
              }
              title={envelope.subject || "(No Subject)"}
              accessories={[
                {
                  icon: envelope.has_attachment ? { source: Icon.Paperclip } : undefined,
                  tooltip: envelope.has_attachment ? "Has Attachment" : undefined,
                },
                {
                  icon: { source: Icon.Person },
                  text: envelope.from?.name || envelope.from?.addr || "Unknown",
                  tooltip: "Sender",
                },
                {
                  icon: { source: Icon.Calendar },
                  text: formatDate(envelope.date || ""),
                  tooltip: "Received date",
                },
                ...getFlagIcons(envelope.flags || []),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    icon={{ source: Icon.Eye }}
                    target={
                      <MessageDetail
                        envelope={envelope}
                        onDelete={() => {
                          loadEnvelopesFromStorage().then((data) => {
                            setEnvelopes(data.envelopes);
                            setLastSync(data.lastSync);
                          });
                        }}
                      />
                    }
                  />
                  <Action
                    title="Delete Email"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={() => handleDelete(envelope.id)}
                  />
                  <Action.Push
                    title="Move Email"
                    icon={{ source: Icon.Folder }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    target={
                      <List navigationTitle="Move Email" searchBarPlaceholder="Search folders">
                        {folders.map((folder) => (
                          <List.Item
                            key={folder.name}
                            title={folder.name}
                            icon={
                              folder.desc.includes("\\Inbox")
                                ? Icon.Envelope
                                : folder.desc.includes("\\Sent")
                                  ? Icon.Airplane
                                  : folder.desc.includes("\\Trash")
                                    ? Icon.Trash
                                    : folder.desc.includes("\\Draft")
                                      ? Icon.Pencil
                                      : Icon.Folder
                            }
                            accessories={[
                              {
                                text: folder.desc,
                              },
                            ]}
                            actions={
                              <ActionPanel>
                                <Action
                                  title="Move to This Folder"
                                  icon={{ source: Icon.Folder }}
                                  onAction={() => {
                                    const prefs = getPreferenceValues<Preferences>();
                                    moveEnvelopeAndRefresh(envelope.id, folder.name, prefs, () => {
                                      // Update local state from localStorage after successful deletion
                                      loadEnvelopesFromStorage().then((data) => {
                                        setEnvelopes(data.envelopes);
                                        setLastSync(data.lastSync);
                                      });
                                      // Pop back to close the folder selection view
                                      pop();
                                    });
                                  }}
                                />
                              </ActionPanel>
                            }
                          />
                        ))}
                      </List>
                    }
                  />
                  <Action.CopyToClipboard title="Copy Subject" content={envelope.subject || "(No Subject)"} />
                  <Action.CopyToClipboard title="Copy ID" content={envelope.id} />
                  <Action.CopyToClipboard
                    title="Copy Sender"
                    content={envelope.from?.name || envelope.from?.addr || "Unknown"}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {filteredEnvelopes.length === 0 && !isLoading && (
        <List.EmptyView
          title="No emails found"
          description={lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : "Try syncing your emails"}
          icon={{ source: Icon.Envelope }}
        />
      )}
    </List>
  );
}
