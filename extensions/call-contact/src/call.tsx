import { List, ActionPanel, Action, Icon, showToast, Toast, Image, environment } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { spawn } from "child_process";
import { useState } from "react";

interface Contact {
  name: string;
  phone: string;
  image?: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { isLoading, data: contacts } = usePromise(
    (query: string) =>
      new Promise<Contact[]>((resolve) => {
        if (!query) {
          resolve([]);
          return;
        }

        const scriptPath = environment.assetsPath + "/search_contacts.swift";

        const child = spawn("swift", [scriptPath, query]);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });

        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });

        child.on("close", (code) => {
          if (code !== 0) {
            console.error("Swift script failed:", stderr);
            resolve([]); // Graceful fallback
            return;
          }

          try {
            const rawList = JSON.parse(stdout) as Contact[];

            // Deduplicate logic
            const uniqueContacts = new Map<string, Contact>();
            rawList.forEach((c) => {
              const key = `${c.name}|${c.phone}`;
              if (!uniqueContacts.has(key)) {
                uniqueContacts.set(key, c);
              }
            });

            resolve(Array.from(uniqueContacts.values()));
          } catch (e) {
            console.error("JSON parse failed", e);
            resolve([]);
          }
        });

        child.on("error", (err) => {
          console.error("Spawn error", err);
          resolve([]);
        });
      }),
    [searchText],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type a name (e.g., Mom)..."
      throttle
    >
      {(contacts || []).map((contact, index) => (
        <List.Item
          key={`${contact.phone}-${index}`}
          title={contact.name}
          subtitle={contact.phone}
          icon={contact.image ? { source: contact.image, mask: Image.Mask.Circle } : Icon.Phone}
          actions={
            <ActionPanel>
              <Action.Open title="Call" target={`tel://${contact.phone.replace(/\s/g, "")}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
