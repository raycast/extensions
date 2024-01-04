import { exec } from "child_process";
import { showHUD, ActionPanel, List, Icon, Action, closeMainWindow } from "@raycast/api";
import { useState, useEffect } from "react";
import { promises as fsPromises } from "fs";
import path from "path";

const documentDirectories = [
  "/Users/kasperhog/Downloads",
  "/Users/kasperhog/Documents",
  "/Users/kasperhog/OneDrive - Syddansk Erhvervsskole",
  "/Users/kasperhog/Library/Mobile Documents/com~apple~CloudDocs",
];

type DocumentInfo = {
  timestamp: number;
  path: string;
};

const fetchDocumentsInFolder = async (folderPath: string): Promise<DocumentInfo[]> => {
  try {
    const documentPaths = await fsPromises.readdir(folderPath, { withFileTypes: true });
    const docxFiles = documentPaths
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".docx") && !dirent.name.startsWith("~$"))
      .map((dirent) => dirent.name);

    const documents = await Promise.all(
      docxFiles.map(async (filename) => {
        const filePath = path.join(folderPath, filename);
        const stats = await fsPromises.stat(filePath);
        return { timestamp: stats.mtimeMs, path: filePath };
      }),
    );

    const subfolderDocuments = (
      await Promise.all(
        documentPaths
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => fetchDocumentsInFolder(path.join(folderPath, dirent.name))),
      )
    ).flat();

    return [...documents, ...subfolderDocuments];
  } catch (error) {
    console.error(`Error fetching documents in ${folderPath}: ${error}`);
    return [];
  }
};

const fetchAllDocuments = async (): Promise<DocumentInfo[]> => {
  const documents = (await Promise.all(documentDirectories.map(fetchDocumentsInFolder))).flat();
  return documents.sort((a, b) => b.timestamp - a.timestamp);
};

export default function Main() {
  const [documentPaths, setDocumentPaths] = useState<DocumentInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 16;

  useEffect(() => {
    fetchAllDocuments().then((allDocuments) => setDocumentPaths(allDocuments.slice(0, limit)));
  }, []);

  const loadMoreDocuments = async () => {
    try {
      const additionalDocuments = await fetchAllDocuments();
      setDocumentPaths((prevDocuments) => [
        ...prevDocuments,
        ...additionalDocuments.slice(prevDocuments.length, prevDocuments.length + limit),
      ]);
    } catch (error) {
      showHUD("Error loading more documents");
    }
  };

  const filteredDocuments = documentPaths.filter((document) =>
    document.path.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <List searchBarPlaceholder="Search documents" onSearchTextChange={(text) => setSearchQuery(text)}>
      {filteredDocuments.map((document) => (
        <List.Item
          key={document.path}
          title={path.basename(document.path)}
          subtitle={`Modified: ${new Date(document.timestamp).toLocaleString()}`}
          icon="../assets/word.png"
          actions={
            <ActionPanel>
              <Action
                title="Open in Finder"
                icon={Icon.Finder}
                onAction={() => {
                  exec(`open "${document.path}"`);
                  closeMainWindow();
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Load More"
        icon={Icon.Repeat}
        actions={
          <ActionPanel>
            <Action title="Load More" icon={Icon.Repeat} onAction={loadMoreDocuments} />
          </ActionPanel>
        }
      />
    </List>
  );
}
