import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getMappings, Mapping } from "./utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMappings = async () => {
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
    };

    fetchMappings();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search mappings..." filtering={true} throttle={true}>
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
              icon={{ source: getIconForType(mapping.type) }}
              actions={
                <ActionPanel>
                  {mapping.httpUrl && <Action.OpenInBrowser title="Open Http URL" url={mapping.httpUrl} />}
                  {mapping.httpsUrl && <Action.OpenInBrowser title="Open Https URL" url={mapping.httpsUrl} />}
                  <Action.CopyToClipboard title="Copy Hostname" content={mapping.hostname} />
                  <Action.CopyToClipboard title="Copy Destination" content={mapping.destination} />
                  {mapping.httpUrl && <Action.CopyToClipboard title="Copy Http URL" content={mapping.httpUrl} />}
                  {mapping.httpsUrl && <Action.CopyToClipboard title="Copy Https URL" content={mapping.httpsUrl} />}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function getIconForType(type: string): Icon {
  switch (type.toLowerCase()) {
    case "node":
      return Icon.Code;
    case "flask":
      return Icon.Terminal;
    case "redis":
      return Icon.Dot;
    case "postgres":
      return Icon.Dot;
    case "mysql":
      return Icon.Dot;
    case "mongo":
      return Icon.Dot;
    case "docker":
      return Icon.Box;
    case "web":
      return Icon.Globe;
    case "api":
      return Icon.Plug;
    default:
      return Icon.Network;
  }
}
