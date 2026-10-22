import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { errorMessage, getStudios, publish, Studio } from "./utils";

export default function Command() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const publishing = useRef(false);

  async function publishSelected(studio: Studio) {
    if (publishing.current) return;
    publishing.current = true;
    try {
      await publish(studio);
    } finally {
      publishing.current = false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    void getStudios()
      .then(async (instances) => {
        if (cancelled) return;
        if (instances.length === 1) {
          await publishSelected(instances[0]);
          if (!cancelled) {
            setStudios(instances);
            setLoading(false);
          }
          return;
        }
        setStudios(instances);
        setLoading(false);
      })
      .catch((failure) => {
        if (!cancelled) {
          setError(errorMessage(failure));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;

  return (
    <List
      isLoading={loading}
      navigationTitle="Publish Place"
      searchBarPlaceholder="Choose a Studio instance..."
    >
      <List.EmptyView
        icon={Icon.Window}
        title={error ?? "No Studio instances open"}
        description={
          error
            ? "Check Studio and try again."
            : "Open a place in Roblox Studio to publish it."
        }
      />
      <List.Section
        title="Studio Instances"
        subtitle="Sorted by most recently interacted"
      >
        {studios.map((studio) => (
          <List.Item
            key={studio.pid}
            id={String(studio.pid)}
            title={studio.title}
            icon="extension-icon.png"
            accessories={[
              { tooltip: "Studio process ID", text: String(studio.pid) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Publish Place"
                  icon={Icon.Upload}
                  onAction={() => publishSelected(studio)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
