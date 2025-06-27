import { List, ActionPanel, Action, Icon, getPreferenceValues, useNavigation, clearSearchBar } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { ExtensionDetails } from "./components/ExtensionDetails";

interface Extension {
  id: number;
  name: string;
  first_name: string;
  display_name: string;
  dnd: boolean;
  email_address: string;
  alias: string[];
}

interface ExtensionsResponse {
  [key: string]: Extension;
}

interface Domain {
  name: string;
  display: string;
}

// interface Response {
//   [key: string]: Domain;
// }

interface Preferences {
  username: string;
  password: string;
  domain: string;
}

export default function Command() {
  const { push } = useNavigation();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchDomains() {
      setIsLoading(true);
      try {
        const url = `https://${preferences.domain}/rest/system/domains`;

        const authString = Buffer.from(`${preferences.username}:${preferences.password}`).toString("base64");

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Basic ${authString}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "Accept-Encoding": "identity",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
          throw new Error("Empty response received from server");
        }

        const data = JSON.parse(text) as { [key: string]: Domain };
        setDomains(Object.values(data));
        setError(null);
      } catch (e) {
        setError("Failed to fetch domains");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDomains();
  }, []);

  useEffect(() => {
    if (!selectedDomain) return;
    async function fetchExtensions() {
      setIsLoading(true);
      try {
        const url = `https://${preferences.domain}/rest/domain/${selectedDomain}/extensions`;

        const authString = Buffer.from(`${preferences.username}:${preferences.password}`).toString("base64");

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Basic ${authString}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "Accept-Encoding": "identity",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        if (!text) {
          throw new Error("Empty response received from server");
        }

        const data = JSON.parse(text) as ExtensionsResponse;
        setExtensions(Object.values(data));
        setError(null);
      } catch (e) {
        setError("Failed to fetch extensions");
      } finally {
        setIsLoading(false);
      }
    }

    fetchExtensions();
  }, [selectedDomain]);

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.Item title={`Error: ${error}`} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose domain to search..." onSearchTextChange={setSearchText}>
      {!selectedDomain
        ? domains
            .filter((domain) => {
              const searchLower = searchText.toLowerCase();
              return (
                domain.name.toLowerCase().includes(searchLower) || domain.display.toLowerCase().includes(searchLower)
              );
            })
            .map((domain) => (
              <List.Item
                key={domain.name}
                title={domain.display}
                actions={
                  <ActionPanel>
                    <Action
                      title="Show Extensions"
                      onAction={async () => {
                        setSelectedDomain(domain.name);
                        await clearSearchBar();
                      }}
                    />
                  </ActionPanel>
                }
              />
            ))
        : extensions
            .filter((ext) => {
              const searchLower = searchText.toLowerCase();
              return (
                ext.name.toString().includes(searchLower) ||
                ext.first_name.toLowerCase().includes(searchLower) ||
                ext.display_name.toLowerCase().includes(searchLower) ||
                ext.email_address.toLowerCase().includes(searchLower) ||
                (ext.alias || []).some((alias) => alias.toLowerCase().includes(searchLower))
              );
            })
            .map((ext) => {
              const extWithDomain = { ...ext, domain: selectedDomain ?? "" };
              return (
                <List.Item
                  key={ext.id}
                  title={ext.first_name + " " + ext.display_name}
                  subtitle={`Ext. ${ext.name}` + " - " + `${extWithDomain.domain}`}
                  accessories={[
                    { text: ext.email_address },
                    ...(ext.alias?.length > 1 ? [{ text: ext.alias.slice(1).join(", ") }] : []),
                  ]}
                  icon={ext.dnd === true ? Icon.CircleFilled : Icon.Circle}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Show Details"
                        onAction={() => push(<ExtensionDetails extension={extWithDomain} />)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Extension Id"
                        content={ext.name.toString()}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Email"
                        content={ext.email_address}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Domain"
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        url={`https://${extWithDomain.domain}`}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
    </List>
  );
}
