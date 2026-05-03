import {
  Action,
  ActionPanel,
  List,
  Form,
  Icon,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getThreatFeeds,
  addThreatFeed,
  updateThreatFeed,
  deleteThreatFeed,
} from "./storage";
import { ThreatFeed } from "./types";

export default function ThreatFeeds() {
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const threatFeeds = await getThreatFeeds();
      setFeeds(threatFeeds);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const { push } = useNavigation();

  const refreshFeeds = async () => {
    const threatFeeds = await getThreatFeeds();
    setFeeds(threatFeeds);
  };

  const handleToggleFeed = async (id: string, enabled: boolean) => {
    await updateThreatFeed(id, { enabled });
    await refreshFeeds();
    showToast(Toast.Style.Success, `Feed ${enabled ? "enabled" : "disabled"}`);
  };

  const handleDeleteFeed = async (feed: ThreatFeed) => {
    const confirmed = await confirmAlert({
      title: "Delete Threat Feed",
      message: `Are you sure you want to delete "${feed.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await deleteThreatFeed(feed.id);
      await refreshFeeds();
      showToast(Toast.Style.Success, "Threat feed deleted");
    }
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Threat Feeds (${feeds.length})`}
      actions={
        <ActionPanel>
          <Action
            title="Add New Feed"
            onAction={() => push(<AddFeedForm onSave={refreshFeeds} />)}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {feeds.length === 0 ? (
        <List.EmptyView
          title="No Threat Feeds"
          description="Add custom patterns to enhance detection"
          icon={Icon.Shield}
          actions={
            <ActionPanel>
              <Action
                title="Add First Feed"
                onAction={() => push(<AddFeedForm onSave={refreshFeeds} />)}
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      ) : (
        feeds.map((feed) => {
          const lastModified = new Date(feed.modified).toLocaleDateString();
          const patternCount = feed.patterns.length;

          return (
            <List.Item
              key={feed.id}
              title={feed.name}
              subtitle={`${patternCount} pattern${
                patternCount === 1 ? "" : "s"
              } • Modified ${lastModified}`}
              icon={feed.enabled ? Icon.CheckCircle : Icon.XMarkCircle}
              accessories={[
                {
                  tag: feed.enabled ? "Enabled" : "Disabled",
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={feed.enabled ? "Disable" : "Enable"}
                      onAction={() => handleToggleFeed(feed.id, !feed.enabled)}
                      icon={feed.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                    />
                    <Action
                      title="Edit"
                      onAction={() =>
                        push(<EditFeedForm feed={feed} onSave={refreshFeeds} />)
                      }
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Add New Feed"
                      onAction={() =>
                        push(<AddFeedForm onSave={refreshFeeds} />)
                      }
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Delete"
                      onAction={() => handleDeleteFeed(feed)}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function AddFeedForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState("");
  const [patterns, setPatterns] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast(Toast.Style.Failure, "Name is required");
      return;
    }

    if (!patterns.trim()) {
      showToast(Toast.Style.Failure, "At least one pattern is required");
      return;
    }

    const patternList = patterns
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (patternList.length === 0) {
      showToast(Toast.Style.Failure, "At least one valid pattern is required");
      return;
    }

    try {
      await addThreatFeed({
        name: name.trim(),
        patterns: patternList,
        enabled: true,
      });

      await onSave();
      pop();
      showToast(Toast.Style.Success, "Threat feed added");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to add threat feed");
    }
  };

  return (
    <Form
      navigationTitle="Add Threat Feed"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Feed"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Feed Name"
        placeholder="e.g., Malicious Domains"
        value={name}
        onChange={setName}
      />

      <Form.TextArea
        id="patterns"
        title="Patterns"
        placeholder="evil.example.com&#10;malware.*.net&#10;phishing-.*\.org"
        value={patterns}
        onChange={setPatterns}
        info="Enter one pattern per line. Supports regex patterns."
      />

      <Form.Description text="Patterns will be matched as regular expressions. Use caution with broad patterns as they may cause false positives." />
    </Form>
  );
}

function EditFeedForm({
  feed,
  onSave,
}: {
  feed: ThreatFeed;
  onSave: () => void;
}) {
  const [name, setName] = useState(feed.name);
  const [patterns, setPatterns] = useState(feed.patterns.join("\n"));
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast(Toast.Style.Failure, "Name is required");
      return;
    }

    if (!patterns.trim()) {
      showToast(Toast.Style.Failure, "At least one pattern is required");
      return;
    }

    const patternList = patterns
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (patternList.length === 0) {
      showToast(Toast.Style.Failure, "At least one valid pattern is required");
      return;
    }

    try {
      await updateThreatFeed(feed.id, {
        name: name.trim(),
        patterns: patternList,
      });

      await onSave();
      pop();
      showToast(Toast.Style.Success, "Threat feed updated");
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to update threat feed");
    }
  };

  return (
    <Form
      navigationTitle="Edit Threat Feed"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Feed Name"
        value={name}
        onChange={setName}
      />

      <Form.TextArea
        id="patterns"
        title="Patterns"
        value={patterns}
        onChange={setPatterns}
        info="Enter one pattern per line. Supports regex patterns."
      />

      <Form.Description text="Patterns will be matched as regular expressions. Use caution with broad patterns as they may cause false positives." />
    </Form>
  );
}
