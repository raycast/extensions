import React from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import Service, { CustomCheatsheet } from "./service";
import type { File as ServiceFile } from "./service";
import { CustomSheetView, SheetView } from "./show-cheatsheets";
import { showFailureToast } from "@raycast/utils";

interface CopyCheatsheetProps {
  arguments?: {
    query?: string;
    type?: "custom" | "default";
  };
}

export default function CopyCheatsheet({ arguments: args }: CopyCheatsheetProps) {
  const [searchQuery, setSearchQuery] = useState(args?.query || "");
  const [filterType, setFilterType] = useState<"all" | "custom" | "default">(
    args?.type === "custom" ? "custom" : args?.type === "default" ? "default" : "all",
  );
  const [customSheets, setCustomSheets] = useState<CustomCheatsheet[]>([]);
  const [defaultSheets, setDefaultSheets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  // Pre-fill search if argument provided
  useEffect(() => {
    if (args?.query) {
      setSearchQuery(args.query);
    }
  }, [args?.query]);

  async function loadData() {
    try {
      setIsLoading(true);
      const [custom, defaultSheetsData] = await Promise.all([Service.getCustomCheatsheets(), Service.listFiles()]);

      setCustomSheets(custom);
      if (defaultSheetsData.length > 0) {
        const sheets = getSheets(defaultSheetsData);
        setDefaultSheets(sheets);
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to load cheatsheets" });
    } finally {
      setIsLoading(false);
    }
  }

  // Inline preview removed to avoid type mismatch issues; use Push to preview views instead.

  // Helper function to get sheets from files
  function getSheets(files: ServiceFile[]): string[] {
    return files
      .filter((file) => {
        const isDir = file.type === "tree";
        const isMarkdown = file.path.endsWith(".md");
        const adminFiles = ["CONTRIBUTING", "README", "index", "index@2016"];
        const isAdminFile = adminFiles.some((adminFile) => file.path.startsWith(adminFile));
        const inUnderscoreDir = /(^|\/)_[^/]+/.test(file.path);
        return !isDir && isMarkdown && !isAdminFile && !inUnderscoreDir;
      })
      .map((file) => file.path.replace(".md", ""));
  }

  async function copyCheatsheetContent(type: "custom" | "default", slug: string, title: string) {
    try {
      let content = "";

      if (type === "custom") {
        const customSheet = customSheets.find((s) => s.id === slug);
        if (!customSheet) {
          throw new Error("Custom cheatsheet not found");
        }
        content = customSheet.content || "";
      } else {
        content = await Service.getSheet(slug);
      }

      if (content && content.trim()) {
        // Use Raycast's Clipboard API instead of navigator.clipboard
        await Clipboard.copy(content);

        showToast({
          style: Toast.Style.Success,
          title: "Copied to Clipboard",
          message: `"${title}" content has been copied`,
        });

        pop();
      } else {
        throw new Error("No content found or content is empty");
      }
    } catch (error) {
      console.error("Copy error:", error);
      showFailureToast(error, { title: "Copy Failed" });
    }
  }

  const filteredCustomSheets = customSheets
    .filter(() => filterType === "all" || filterType === "custom")
    .filter(
      (sheet) =>
        searchQuery === "" ||
        sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        sheet.description?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  const filteredDefaultSheets = defaultSheets
    .filter(() => filterType === "all" || filterType === "default")
    .filter((sheet) => searchQuery === "" || Service.defaultMatchesQuery(sheet, searchQuery));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cheatsheets to copy..."
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Type"
          value={filterType}
          onChange={(value) => setFilterType(value as "all" | "custom" | "default")}
        >
          <List.Dropdown.Item title="All Types" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Custom Only" value="custom" icon={Icon.Document} />
          <List.Dropdown.Item title="Default Only" value="default" icon={Icon.Globe} />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadData} />
        </ActionPanel>
      }
    >
      {filteredCustomSheets.length === 0 && filteredDefaultSheets.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No cheatsheets found"
          description={searchQuery ? `No cheatsheets match "${searchQuery}"` : "No cheatsheets available"}
        />
      ) : (
        <>
          {filteredCustomSheets.length > 0 && (
            <List.Section title="Custom Cheatsheets" subtitle={`${filteredCustomSheets.length} custom sheets`}>
              {filteredCustomSheets.map((sheet) => (
                <List.Item
                  key={sheet.id}
                  title={sheet.title}
                  subtitle={sheet.description || "Custom"}
                  icon={sheet.iconKey ? Service.iconForKey(sheet.iconKey) : Icon.Document}
                  accessories={[
                    { text: "Custom", icon: Icon.Tag },
                    { date: new Date(sheet.updatedAt) },
                    ...(sheet.tags || []).slice(0, 3).map((t) => ({ text: t })),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push title="Preview" icon={Icon.Window} target={<CustomSheetView sheet={sheet} />} />
                      <Action
                        title="Copy Content"
                        icon={Icon.CopyClipboard}
                        onAction={() => copyCheatsheetContent("custom", sheet.id, sheet.title)}
                      />
                      <Action.CopyToClipboard title="Copy Title" content={sheet.title} icon={Icon.CopyClipboard} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {filteredDefaultSheets.length > 0 && (
            <List.Section title="Default Cheatsheets" subtitle={`${filteredDefaultSheets.length} default sheets`}>
              {filteredDefaultSheets.map((sheet) => (
                <List.Item
                  key={sheet}
                  title={sheet}
                  subtitle={
                    Service.getDefaultMetadata(sheet)?.description ||
                    (Service.isLocalCheatsheet(sheet) ? "Local cheatsheet" : "From online sources")
                  }
                  icon={Service.resolveIconForSlug(sheet)}
                  accessories={[
                    {
                      text: Service.isLocalCheatsheet(sheet) ? "Local" : "Default",
                      icon: Service.isLocalCheatsheet(sheet) ? Icon.Document : Icon.Globe,
                    },
                    ...(Service.getDefaultMetadata(sheet)?.tags || []).slice(0, 3).map((t) => ({ text: t })),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push title="Preview" icon={Icon.Window} target={<SheetView slug={sheet} />} />
                      <Action
                        title="Copy Content"
                        icon={Icon.CopyClipboard}
                        onAction={() => copyCheatsheetContent("default", sheet, sheet)}
                      />
                      <Action.CopyToClipboard title="Copy Title" content={sheet} icon={Icon.CopyClipboard} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
