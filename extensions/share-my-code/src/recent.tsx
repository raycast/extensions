import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import ViewCodeAction from "./components/ViewCodeAction";
import useStoredRecents from "./hooks/useStoredRecents";
import { smcUrl } from "./Constants";
import { useEffect, useState } from "react";
import CreateCodeAction from "./components/CreateCodeAction";

export default function RecentCommand() {
  const { recents, deleteRecent, clearRecents, isLoading } = useStoredRecents();

  const [filteredRecents, setFilteredRecents] = useState(recents);
  const [languages, setLanguages] = useState<string[]>();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  useEffect(() => {
    const languages = Array.from(
      new Set(recents.filter((recent) => recent.language !== "Unknown").map((recent) => recent.language)),
    ).filter((language) => language !== undefined) as string[];
    setLanguages(languages);
  }, [recents]);

  useEffect(() => {
    if (selectedLanguage === "all") {
      setFilteredRecents(recents);
    } else {
      setFilteredRecents(recents.filter((recent) => recent.language === selectedLanguage));
    }
  }, [recents, selectedLanguage]);

  return (
    <List
      navigationTitle="Recent code shared"
      isLoading={isLoading}
      searchBarPlaceholder="Search your recents"
      searchBarAccessory={
        languages && languages.length > 0 ? (
          <List.Dropdown
            tooltip="Select a content language"
            placeholder="Select a language"
            isLoading={isLoading}
            onChange={setSelectedLanguage}
            value={selectedLanguage}
          >
            <List.Dropdown.Item key="all" title="All" value="all" />
            {languages?.map((language) => (
              <List.Dropdown.Item
                key={language}
                title={language}
                value={language}
                icon={{ source: Icon.Code, tintColor: Color.Yellow }}
              />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {filteredRecents.length === 0 ? (
        <List.EmptyView
          icon={{ source: "smc.svg", tintColor: Color.Red }}
          title="No recent code shared"
          description={
            "You haven't created any ShareMyCode" +
            (selectedLanguage != "all" ? " in " + selectedLanguage : "") +
            " (yet!)"
          }
          actions={
            <ActionPanel>
              <CreateCodeAction slug="" />
            </ActionPanel>
          }
        />
      ) : (
        filteredRecents.map((recent) => {
          const accessories: object[] = [{ date: new Date(recent.date) }];
          recent.language != "Unknown" &&
            accessories.unshift({ tag: { value: recent.language, color: Color.Yellow }, icon: Icon.Code });
          return (
            <List.Item
              key={recent.slug}
              title={recent.slug}
              subtitle={
                recent.content.length > 25 ? recent.content.replace("\n", "").substring(0, 50) + "..." : recent.content
              }
              icon={{ source: "smc.svg", tintColor: Color.Yellow }}
              accessories={accessories}
              actions={
                <ActionPanel title={`sharemycode.fr/${recent.slug}`}>
                  <ActionPanel.Section>
                    <ViewCodeAction slug={recent.slug} />
                    <Action.OpenInBrowser title="Open in Browser" url={`${smcUrl}/${recent.slug}`} />
                    <Action.CopyToClipboard title="Copy URL" content={`${smcUrl}/${recent.slug}`} icon={Icon.Link} />
                    <Action.CopyToClipboard title="Copy Content" content={recent.content} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage recents">
                    <RemoveRecentAction
                      onDelete={() => {
                        deleteRecent(recent.slug);
                      }}
                    />
                    <ClearRecentsAction
                      onClear={() => {
                        clearRecents();
                      }}
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

function RemoveRecentAction({ onDelete }: { onDelete: () => void }) {
  return (
    <Action
      title="Remove From Recents"
      icon={Icon.Minus}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={onDelete}
    />
  );
}

function ClearRecentsAction({ onClear }: { onClear: () => void }) {
  return <Action title="Clear All Recents" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onClear} />;
}
