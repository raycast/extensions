import { List, ActionPanel, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getMappings, Mapping, runLightproxyCommand } from "./utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMappings();
  }, []);

  async function fetchMappings() {
    try {
      setIsLoading(true);
      const result = await getMappings();
      setMappings(result);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setMappings([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveMapping(hostname: string) {
    try {
      setIsLoading(true);

      await showToast({
        style: Toast.Style.Animated,
        title: "Removing Mapping",
        message: hostname,
      });

      await runLightproxyCommand(["remove", hostname]);

      await showToast({
        style: Toast.Style.Success,
        title: "Mapping Removed",
        message: hostname,
      });

      // Refresh the list
      await fetchMappings();
    } catch (error) {
      console.error("Error removing mapping:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Remove Mapping",
        message: (error as Error).message,
      });

      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search mappings to remove..." filtering={true} throttle={true}>
      {error ? (
        <List.Item title="Error" subtitle={error} icon={{ source: Icon.Warning, tintColor: Color.Red }} />
      ) : (
        <List.Section title={`Mappings (${mappings.length})`}>
          {mappings.map((mapping, index) => (
            <List.Item
              key={`${mapping.hostname}-${index}`}
              title={mapping.hostname}
              subtitle={mapping.destination}
              accessories={[{ text: mapping.type }]}
              icon={{ source: Icon.Trash, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove Mapping"
                    icon={Icon.Trash}
                    onAction={() => handleRemoveMapping(mapping.hostname)}
                  />
                  {mapping.httpUrl && <Action.OpenInBrowser title="Open Http URL" url={mapping.httpUrl} />}
                  {mapping.httpsUrl && <Action.OpenInBrowser title="Open Https URL" url={mapping.httpsUrl} />}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
