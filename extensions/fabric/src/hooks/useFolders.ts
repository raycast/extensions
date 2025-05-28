import { useState, useEffect } from 'react';
import { showToast, Toast } from "@raycast/api";

import { getFabricClient, Kind, Resource } from "../api/fabricClient";

export function useFolders() {
  const [folders, setFolders] = useState<Resource[]>([]);

  useEffect(() => {
    const fetchFolders = async () => {
      const fabricClient = getFabricClient();
      try {
        const foldersList = await fabricClient.listResources({
          text: "",
          kind: Kind.FOLDER,
          includeRoots: true,
          order: {
            property: "name"
          },
        });

        // Spaces should come on top, otherwise sort alphabetically
        foldersList.sort((a, b) => {
          if (!a.parent && !b.parent) return a.name.localeCompare(b.name);
          if (!a.parent) return -1; // a has no parent, comes first
          if (!b.parent) return 1; // b has no parent, comes first
          return a.name.localeCompare(b.name); // both have parents, sort alphabetically
        });

        setFolders(foldersList);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch folders",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    };

    fetchFolders();
  }, []);

  return folders;
}
