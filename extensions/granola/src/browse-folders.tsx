import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import getCache from "./utils/getCache";
import { useFolders } from "./utils/useFolders";
import { Doc } from "./utils/types";
import Unresponsive from "./templates/unresponsive";
import { useState, useEffect } from "react";
import { NoteListItem } from "./components/NoteComponents";
import { mapIconToHeroicon, mapColorToHex, getDefaultIconUrl } from "./utils/iconMapper";

const FolderList = () => {
  const { folders, isLoading } = useFolders();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search folders...">
      {folders.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Folder, tintColor: Color.Blue }}
          title="No Folders Found"
          description="You don't have any folders yet. Create folders in Granola to organize your notes."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Granola App" url="granola://" icon={Icon.AppWindow} />
            </ActionPanel>
          }
        />
      ) : (
        folders.map((folder) => (
          <List.Item
            key={folder.id}
            title={folder.title}
            subtitle={
              folder.description
                ? folder.description.trim().length > 80
                  ? folder.description.trim().slice(0, 77) + "..."
                  : folder.description.trim()
                : ""
            }
            icon={{
              source: folder.icon ? mapIconToHeroicon(folder.icon.value) : getDefaultIconUrl(),
              tintColor: folder.icon ? mapColorToHex(folder.icon.color) : Color.Blue,
            }}
            accessories={[{ text: `${folder.document_ids.length} notes` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Notes in Folder"
                  icon={Icon.Document}
                  target={<DocumentsList folderTitle={folder.title} documentIds={folder.document_ids} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};

// Display documents in a folder
function DocumentsList({ folderTitle, documentIds }: { folderTitle: string; documentIds: string[] }) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Fetch data using a more direct approach
  useEffect(() => {
    let isMounted = true;

    const fetchDocuments = async () => {
      try {
        // Get data from Granola API
        const url = `https://api.granola.ai/v2/get-documents`;
        const token = await import("./utils/getAccessToken").then((mod) => mod.default());

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.docs) {
          setIsLoading(false);
          return;
        }

        // Fix any types with proper interfaces
        interface GranolaDocument extends Doc {
          [key: string]: unknown;
        }

        // Filter docs to those in the folder
        const folderDocs = data.docs.filter((doc: GranolaDocument) => documentIds.includes(doc.id));

        if (isMounted) {
          // Sort docs by date
          const sortedDocs = [...folderDocs].sort(
            (a: GranolaDocument, b: GranolaDocument) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );

          setDocuments(sortedDocs);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [documentIds]);

  const cacheData = getCache();
  const panels = cacheData?.state?.documentPanels;
  const untitledNoteTitle = "Untitled Note";

  if (error) {
    return (
      <List navigationTitle={`${folderTitle} Notes`}>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error Loading Notes"
          description="There was a problem loading notes from this folder. Try refreshing Granola or restarting the app."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Granola App" url="granola://" icon={Icon.AppWindow} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${folderTitle} Notes`}
      searchBarPlaceholder="Search notes in this folder..."
    >
      {documents.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.Document, tintColor: Color.Blue }}
          title="No Notes in This Folder"
          description={`This folder doesn't contain any notes yet. Start adding notes to "${folderTitle}" in Granola.`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Granola to Add Notes" url="granola://" icon={Icon.AppWindow} />
            </ActionPanel>
          }
        />
      ) : (
        documents.map((doc) => (
          <NoteListItem key={doc.id} doc={doc} panels={panels} untitledNoteTitle={untitledNoteTitle} folders={[]} />
        ))
      )}
    </List>
  );
}

export default function Command() {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check if Granola is available before rendering
  useEffect(() => {
    const checkGranola = async () => {
      try {
        // Try to access local cache to verify Granola is running
        getCache();
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      }
    };

    checkGranola();
  }, []);

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (error) {
    return <Unresponsive />;
  }

  return <FolderList />;
}
