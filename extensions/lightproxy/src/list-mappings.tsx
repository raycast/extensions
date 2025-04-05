import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { useState, useEffect } from "react";

const execPromise = promisify(exec);

interface Mapping {
  type: "PORT" | "FOLDER";
  name: string;
  destination: string;
  httpUrl?: string;
  httpsUrl?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [configFile, setConfigFile] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMappings() {
      try {
        const { stdout, stderr } = await execPromise("lightproxy list --urls");

        if (stderr && stderr.trim().length > 0) {
          throw new Error(stderr);
        }

        const parsedMappings = parseMappingsOutput(stdout);
        setMappings(parsedMappings.mappings);
        setConfigFile(parsedMappings.configFile);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch mappings",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchMappings();
  }, []);

  function parseMappingsOutput(output: string): { mappings: Mapping[]; configFile: string } {
    const mappings: Mapping[] = [];
    let configFile = "";

    // Get the config file path
    const configMatch = output.match(/Config file: (.+)/);
    if (configMatch && configMatch[1]) {
      configFile = configMatch[1];
    }

    // Match pattern for entries like:
    // • PORT: example.test → 127.0.0.1:3000
    //   ◦ HTTP:  http://example.test:7999
    //   ◦ HTTPS: https://example.test:7998
    const mappingRegex = /• (PORT|FOLDER): (.+) → (.+)(?:\s+◦ HTTP:\s+(.+))?(?:\s+◦ HTTPS:\s+(.+))?/gm;

    let match;
    while ((match = mappingRegex.exec(output)) !== null) {
      mappings.push({
        type: match[1] as "PORT" | "FOLDER",
        name: match[2],
        destination: match[3],
        httpUrl: match[4],
        httpsUrl: match[5],
      });
    }

    return { mappings, configFile };
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search mappings..." throttle={true}>
      <List.Section title={`Mappings (${mappings.length})`} subtitle={configFile}>
        {mappings.map((mapping, index) => (
          <List.Item
            key={index}
            title={mapping.name}
            subtitle={mapping.destination}
            icon={mapping.type === "PORT" ? Icon.Globe : Icon.Folder}
            accessories={[
              {
                tag: mapping.type,
              },
            ]}
            actions={
              <ActionPanel>
                {mapping.httpUrl && <Action.OpenInBrowser title="Open Http URL" url={mapping.httpUrl} />}
                {mapping.httpsUrl && <Action.OpenInBrowser title="Open Https URL" url={mapping.httpsUrl} />}
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={mapping.name}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Destination"
                  content={mapping.destination}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                {mapping.httpUrl && (
                  <Action.CopyToClipboard
                    title="Copy Http URL"
                    content={mapping.httpUrl}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                )}
                {mapping.httpsUrl && (
                  <Action.CopyToClipboard
                    title="Copy Https URL"
                    content={mapping.httpsUrl}
                    shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "c" }}
                  />
                )}
                <Action
                  title="Remove Mapping"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => {
                    showToast({
                      style: Toast.Style.Animated,
                      title: "Removing mapping...",
                      message: mapping.name,
                    });
                    // In a real implementation, this would execute the remove command
                    // execPromise(`lightproxy remove ${mapping.name}`);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {error && <List.EmptyView title="Error Loading Mappings" description={error} icon={Icon.ExclamationMark} />}
      {!error && mappings.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Mappings Found"
          description="You don't have any LightProxy mappings. Use the Auto-Setup command to create your first mappings."
          icon={Icon.BlankDocument}
        />
      )}
    </List>
  );
}
