import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { DomainListItem } from "./DomainCommandList";

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

interface Preferences {
  username: string;
  password: string;
  domain: string;
}

export function DomainExtensions({ domain }: { domain: DomainListItem }) {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetchExtensions() {
      try {
        const username = preferences.username;
        const password = preferences.password;
        const url = "https://" + preferences.domain + `/rest/domain/${domain.name}/extensions`;
        console.log(url);

        const authString = Buffer.from(`${username}:${password}`).toString("base64");

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
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();

        if (!text) {
          throw new Error("Empty response received from server");
        }

        const data = JSON.parse(text) as ExtensionsResponse;
        const extensionList = Object.values(data);
        setExtensions(extensionList);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setError(errorMessage);
        setExtensions([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExtensions();
  }, [domain]);

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.Item title={`Error: ${error}`} icon={Icon.ExclamationMark} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Extensions for ${domain.display}`}>
        {extensions.map((ext, index) => (
          <List.Item
            key={index}
            title={ext.first_name + " " + ext.display_name}
            subtitle={ext.id.toString()}
            accessories={[{ text: ext.email_address }, ...(ext.alias?.length ? [{ text: ext.alias.join(", ") }] : [])]}
            icon={ext.dnd === true ? Icon.CircleFilled : Icon.Circle}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Extension"
                  content={ext.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
