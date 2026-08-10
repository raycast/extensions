import {
  useNavigation,
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  Alert,
  confirmAlert,
  pasteText,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import {
  searchTerms,
  GlossaryTerm,
  deleteTerm,
  deleteAllTerms,
} from "./data-store";
import { getPreferences, getFormattedContent } from "./preferences-store";
import EditTerm from "./edit-term";
import InsertTerm from "./insert-term";

type SortOrder = "a-z" | "z-a" | "latest" | "oldest";

interface LaunchProps {
  arguments: {
    term?: string;
  };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/[#*_~`]/g, "") // Remove markdown symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert markdown links to just text
    .trim();
}

export default function SearchGlossary(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.arguments.term || "");
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>("a-z");
  const [preferences] = useState(getPreferences());

  const { pop } = useNavigation();

  const search = useCallback(async () => {
    setIsLoading(true);
    const results = await searchTerms(searchText);
    const sortedResults = [...results];

    switch (sortOrder) {
      case "a-z":
        sortedResults.sort((a, b) => a.term.localeCompare(b.term));
        break;
      case "z-a":
        sortedResults.sort((a, b) => b.term.localeCompare(a.term));
        break;
      case "latest":
        sortedResults.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        break;
      case "oldest":
        sortedResults.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        break;
    }

    setTerms(sortedResults);
    setIsLoading(false);
  }, [searchText, sortOrder]);

  useEffect(() => {
    void search();
  }, [search]);

  const getActionPanel = (term: GlossaryTerm) => {
    const primaryContent = getFormattedContent(
      term.term,
      term.definition,
      preferences.primaryActionTarget,
    );
    const isPrimaryCopy = preferences.primaryAction === "copy";
    const targetLabel =
      preferences.primaryActionTarget === "both"
        ? "Term and Definition"
        : preferences.primaryActionTarget;

    return (
      <ActionPanel>
        {/* Primary Action */}
        {isPrimaryCopy ? (
          <Action.CopyToClipboard
            title={`Copy ${targetLabel}`}
            content={primaryContent}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onCopy={async () => {
              await showToast({
                style: Toast.Style.Success,
                title: "Copied to clipboard",
                message:
                  preferences.primaryActionTarget === "both"
                    ? `${term.term} and definition copied`
                    : `${targetLabel} copied`,
              });
            }}
          />
        ) : (
          <Action
            title={`Paste ${targetLabel}`}
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={async () => {
              try {
                await pasteText(primaryContent);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Pasted to active app",
                  message:
                    preferences.primaryActionTarget === "both"
                      ? `${term.term} and definition pasted`
                      : `${targetLabel} pasted`,
                });
              } catch (error) {
                showFailureToast(error, {
                  title: "Failed to paste",
                });
              }
            }}
          />
        )}

        {/* Secondary Actions */}
        <Action.CopyToClipboard
          title="Copy Definition"
          content={term.definition}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
        />

        <Action.CopyToClipboard
          title="Copy Term"
          content={term.term}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />

        <Action
          title="Paste Definition"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={async () => {
            try {
              await pasteText(term.definition);
              await showToast({
                style: Toast.Style.Success,
                title: "Definition pasted",
              });
            } catch (error) {
              showFailureToast(error, {
                title: "Failed to paste definition",
              });
            }
          }}
        />

        <Action
          title="Paste Term"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          onAction={async () => {
            try {
              await pasteText(term.term);
              await showToast({
                style: Toast.Style.Success,
                title: "Term pasted",
              });
            } catch (error) {
              showFailureToast(error, {
                title: "Failed to paste term",
              });
            }
          }}
        />

        <Action.Push
          title="Edit Term"
          target={
            <EditTerm
              term={term}
              onEdit={() => {
                pop();
                search();
              }}
            />
          }
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />

        <Action.Push
          title="Insert Term"
          target={
            <InsertTerm
              onInsert={() => {
                pop();
                search();
              }}
              initialTerm={searchText}
            />
          }
          icon={Icon.Text}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
        />

        <Action
          title="Delete Term"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete Term",
              message: `Are you sure you want to delete "${term.term}"?`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              try {
                await deleteTerm(term.id);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Term deleted successfully",
                });
                search();
              } catch (error) {
                showFailureToast(error, {
                  title: "Failed to delete term",
                });
              }
            }
          }}
        />

        <Action
          title="Delete All Terms"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete All Terms",
              message: `Are you sure you want to delete all ${terms.length} terms? This action cannot be undone.`,
              primaryAction: {
                title: "Delete All",
                style: Alert.ActionStyle.Destructive,
              },
            });

            if (confirmed) {
              try {
                await deleteAllTerms();
                await showToast({
                  style: Toast.Style.Success,
                  title: "All terms deleted successfully",
                });
                search();
              } catch (error) {
                showFailureToast(error, {
                  title: "Failed to delete all terms",
                });
              }
            }
          }}
        />
      </ActionPanel>
    );
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchText={searchText}
      searchBarPlaceholder="Search terms..."
      throttle
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort Order"
          storeValue
          value={sortOrder}
          onChange={(newValue: string) => setSortOrder(newValue as SortOrder)}
        >
          <List.Dropdown.Item title="A → Z" value="a-z" />
          <List.Dropdown.Item title="Z → A" value="z-a" />
          <List.Dropdown.Item title="Latest Inserted" value="latest" />
          <List.Dropdown.Item title="Oldest Inserted" value="oldest" />
        </List.Dropdown>
      }
    >
      {terms.length === 0 ? (
        <List.EmptyView
          title="No terms found"
          description="Press Enter or ⌘I to insert a new term"
          actions={
            <ActionPanel>
              <Action.Push
                title="Insert Term"
                target={
                  <InsertTerm
                    onInsert={() => {
                      pop();
                      search();
                    }}
                    initialTerm={searchText}
                  />
                }
                icon={Icon.Text}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        terms.map((term) => (
          <List.Item
            key={term.id}
            title={term.term}
            subtitle={stripMarkdown(
              term.definition.length > 100
                ? `${term.definition.substring(0, 100)}...`
                : term.definition,
            )}
            detail={
              <List.Item.Detail
                markdown={`# ${term.term}\n\n${term.definition}`}
              />
            }
            actions={getActionPanel(term)}
          />
        ))
      )}
    </List>
  );
}
