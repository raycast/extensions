import { useEffect, useState, useCallback } from "react";
import { List, Action, ActionPanel, Icon } from "@raycast/api";
import FolderDetail from "./folder-detail";
import { DocItem, SectionInfo, StoredDocsConfig } from "./types";
import { fetchAndParseNavigation } from "./utils";
import { getVisibleDocs } from "./storage";

export default function Command() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [availableDocs, setAvailableDocs] = useState<StoredDocsConfig[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadAvailableDocs = async () => {
      const visibleDocs = await getVisibleDocs();
      setAvailableDocs(visibleDocs);
      setIsInitialized(true);
      if (visibleDocs.length === 0) {
        setIsLoading(false);
      }
    };
    loadAvailableDocs();
  }, []);

  const loadDocs = useCallback(
    async (sourceName: string) => {
      if (!sourceName) return;

      const docConfig = availableDocs.find((doc) => doc.name === sourceName);
      if (!docConfig) return;

      setIsLoading(true);
      try {
        const { sections: parsedSections, docs: parsedDocs } = await fetchAndParseNavigation(docConfig);
        setSections(parsedSections);
        setDocs(parsedDocs);
      } catch (error) {
        console.error("Failed to load documentation:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [availableDocs],
  );

  useEffect(() => {
    if (selectedSource && availableDocs.length > 0) {
      loadDocs(selectedSource);
    }
  }, [selectedSource, loadDocs, availableDocs]);

  const handleSourceChange = (value: string) => {
    setSelectedSource(value);
  };

  const groupedBySection: Record<string, DocItem[]> = {};
  for (const doc of docs) {
    if (!groupedBySection[doc.section]) {
      groupedBySection[doc.section] = [];
    }
    groupedBySection[doc.section].push(doc);
  }

  const orderedSections = sections
    .map((s) => s.name)
    .filter((name) => groupedBySection[name] && groupedBySection[name].length > 0);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${selectedSource || "documentation"}...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Documentation"
          value={selectedSource}
          onChange={handleSourceChange}
          storeValue={true}
        >
          {availableDocs.map((docConfig) => (
            <List.Dropdown.Item key={docConfig.name} title={docConfig.name} value={docConfig.name} />
          ))}
        </List.Dropdown>
      }
    >
      {isInitialized && availableDocs.length === 0 ? (
        <List.EmptyView
          title="No Documentation Sources"
          description="All documentation sources are hidden or deleted. Use 'Manage Documentation Sources' command to add or show documentation."
        />
      ) : (
        orderedSections.map((sectionName) => (
          <List.Section key={`${selectedSource}-${sectionName}`} title={sectionName}>
            {groupedBySection[sectionName]?.map((doc: DocItem) => (
              <List.Item
                key={doc.url}
                title={doc.title}
                icon={doc.icon}
                actions={
                  <ActionPanel>
                    {doc.icon === Icon.Folder && (
                      <Action.Push
                        title="View Folder Contents"
                        icon={Icon.List}
                        target={<FolderDetail folderUrl={doc.url} folderTitle={doc.title} />}
                      />
                    )}
                    <Action.OpenInBrowser url={doc.url} title="Open in Browser" />
                    <Action.CopyToClipboard content={doc.url} title="Copy URL" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
