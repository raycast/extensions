import { useEffect, useState } from "react";
import { ActionPanel, Action, Icon, List, Detail, confirmAlert, Color } from "@raycast/api";
import { Envelope, Flags } from "./models";
import { execa } from "execa";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./preferences";
import { deleteEnvelopeAndRefresh, loadEnvelopesFromStorage } from "./control";

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
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    fetchMessageBody();
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
              deleteEnvelopeAndRefresh(envelope.id, prefs, onDelete);
            }}
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

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    loadEnvelopesFromStorage().then((data) => {
      setEnvelopes(data.envelopes);
      setLastSync(data.lastSync);
      setIsLoading(false);
    });
  }, []);

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
        },
      })
    ) {
      deleteEnvelopeAndRefresh(id, preferences, () => {
        loadEnvelopesFromStorage().then((data) => {
          setEnvelopes(data.envelopes);
          setLastSync(data.lastSync);
        });
      });
    }
  };

  // Group envelopes by date
  const groupedEnvelopes = envelopes.reduce<Record<string, Envelope[]>>((acc, envelope) => {
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

  return (
    <List isLoading={isLoading} navigationTitle="Email Envelopes">
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
      {envelopes.length === 0 && !isLoading && (
        <List.EmptyView
          title="No emails found"
          description={lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : "Try syncing your emails"}
          icon={{ source: Icon.Envelope }}
        />
      )}
    </List>
  );
}
