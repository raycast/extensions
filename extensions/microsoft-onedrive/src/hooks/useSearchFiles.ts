import {
  Alert,
  Application,
  confirmAlert,
  getApplications,
  getPreferenceValues,
  Icon,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllDrives } from "../api/drives";
import {
  createShareLink,
  deleteFile,
  downloadFile,
  getFolderContents,
  getFolderItem,
  getParentFolderUrl,
  loadNextPage,
  searchFiles,
} from "../api/files";
import { authorize } from "../oauth";
import type { BreadcrumbPath, Drive, DriveItem, SortConfig } from "../types";
import { findInstalledOfficeApps } from "../utils/display";

export function useSearchFiles() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<DriveItem[]>([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<BreadcrumbPath | null>(null);
  const [currentFolderItem, setCurrentFolderItem] = useState<DriveItem | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbPath[]>([{ id: "root", name: "OneDrive" }]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [currentDrive, setCurrentDrive] = useState<Drive | null>(null);
  const [nextLink, setNextLink] = useState<string | undefined>(undefined);
  const [installedOfficeApps, setInstalledOfficeApps] = useState<Map<string, Application>>(new Map());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "relevance", direction: "desc" });

  // Load saved sort preference on mount
  useEffect(() => {
    const loadSortPreference = async () => {
      const saved = await LocalStorage.getItem<string>("sortPreference");
      if (saved === "relevance" || saved === "lastModifiedDateTime") {
        setSortConfig({ field: saved, direction: "desc" });
      }
    };
    loadSortPreference();
  }, []);

  // Check which Office apps are installed
  useEffect(() => {
    const checkInstalledApps = async () => {
      const allApps = await getApplications();
      setInstalledOfficeApps(findInstalledOfficeApps(allApps));
    };
    checkInstalledApps();
  }, []);

  // Navigate into a folder
  const navigateDown = useCallback(
    async (folder: DriveItem) => {
      setIsLoading(true);
      try {
        const result = await getFolderContents(folder.id, currentDrive?.id);

        const existingIndex = breadcrumbs.findIndex((b) => b.id === folder.id);
        const newBreadcrumbs =
          existingIndex === -1
            ? [...breadcrumbs, { id: folder.id, name: folder.name }]
            : breadcrumbs.slice(0, existingIndex + 1);

        // Update all states together to avoid race conditions
        setItems(result.items);
        setNextLink(result.nextLink);
        setCurrentFolder({ id: folder.id, name: folder.name });
        setCurrentFolderItem(folder);
        setBreadcrumbs(newBreadcrumbs);
        setSearchText("");
      } catch (error) {
        console.error("Navigation error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [breadcrumbs, currentDrive],
  );

  // Navigate up to parent folder
  const navigateUp = useCallback(async () => {
    setIsLoading(true);
    setSearchText("");
    try {
      const parentIndex = breadcrumbs.length - 2;

      // If we have parentReference from the current folder item, use it to navigate
      // This happens when we enter a folder from search results
      if (currentFolderItem?.parentReference?.id && breadcrumbs.length === 2) {
        const parentId = currentFolderItem.parentReference.id;
        const parentName = currentFolderItem.parentReference.name;

        // Check if the parent is the root folder by comparing with drive root
        const isParentRoot = parentName === "root";

        if (isParentRoot) {
          // Parent is root, navigate to drive root
          const result = await searchFiles("", currentDrive?.id);
          setItems(result.items);
          setNextLink(result.nextLink);
          setCurrentFolder(null);
          setCurrentFolderItem(null);
          setBreadcrumbs([{ id: "root", name: currentDrive!.name }]);
        } else {
          // Parent is not root, navigate to parent folder
          const result = await getFolderContents(parentId, currentDrive?.id);

          // Fetch the parent folder item to get its parentReference for continued navigation
          const parentFolderItem = await getFolderItem(parentId, currentDrive?.id);

          setItems(result.items);
          setNextLink(result.nextLink);
          setCurrentFolder({ id: parentId, name: parentName });
          // Store the parent folder item for future navigation up
          setCurrentFolderItem(parentFolderItem);
          setBreadcrumbs([
            { id: "root", name: currentDrive!.name },
            { id: parentId, name: parentName },
          ]);
        }
      } else if (parentIndex === 0) {
        // We're one level deep in breadcrumbs, go back to root
        const result = await searchFiles("", currentDrive?.id);
        setItems(result.items);
        setNextLink(result.nextLink);
        setCurrentFolder(null);
        setCurrentFolderItem(null);
        setBreadcrumbs([{ id: "root", name: currentDrive!.name }]);
      } else if (parentIndex > 0) {
        // We have a known breadcrumb trail, navigate to parent in breadcrumbs
        const parentFolder = breadcrumbs[parentIndex];
        const result = await getFolderContents(parentFolder.id, currentDrive?.id);
        setItems(result.items);
        setNextLink(result.nextLink);
        setCurrentFolder({ id: parentFolder.id, name: parentFolder.name });
        setCurrentFolderItem(null);
        setBreadcrumbs(breadcrumbs.slice(0, parentIndex + 1));
      }
    } catch (error) {
      console.error("Navigation error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [breadcrumbs, currentDrive, currentFolderItem]);

  // Initialize: authorize and load drives
  useEffect(() => {
    async function initialize() {
      try {
        await authorize();
        setIsAuthorized(true);

        const [allDrives, initialFiles] = await Promise.all([getAllDrives(), searchFiles("")]);

        setDrives(allDrives);

        if (allDrives.length > 0) {
          const firstDrive = allDrives[0];
          setCurrentDrive(firstDrive);
          setBreadcrumbs([{ id: "root", name: firstDrive.name }]);

          if (!firstDrive.siteDisplayName) {
            setItems(initialFiles.items);
            setNextLink(initialFiles.nextLink);
          } else {
            const result = await searchFiles("", firstDrive.id);
            setItems(result.items);
            setNextLink(result.nextLink);
          }
        }
        setInitialLoadDone(true);
      } catch (error) {
        console.error("Authorization error:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Authorization Failed",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  // React to search text changes
  useEffect(() => {
    if (!isAuthorized || !initialLoadDone) return;

    let isCancelled = false;

    const performAction = async () => {
      if (!searchText || searchText.trim().length === 0) {
        setIsLoading(true);
        try {
          if (currentFolder) {
            const result = await getFolderContents(currentFolder.id, currentDrive?.id);
            if (isCancelled) return;
            setItems(result.items);
            setNextLink(result.nextLink);
          } else {
            const result = await searchFiles("", currentDrive?.id);
            if (isCancelled) return;
            setItems(result.items);
            setNextLink(result.nextLink);
          }
        } catch (error) {
          if (isCancelled) return;
          console.error("Reload error:", error);
        } finally {
          if (!isCancelled) setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const result = await searchFiles(searchText, currentDrive?.id, sortConfig.field);
        if (isCancelled) return;
        setItems(result.items);
        setNextLink(result.nextLink);
      } catch (error) {
        if (isCancelled) return;
        console.error("Search error:", error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    performAction();

    return () => {
      isCancelled = true;
    };
  }, [searchText, isAuthorized, initialLoadDone, currentDrive?.id, currentFolder, sortConfig]);

  // Handle drive change
  const handleDriveChange = useCallback(
    async (driveId: string) => {
      const selectedDrive = drives.find((d) => d.id === driveId);
      if (!selectedDrive) return;

      if (currentDrive?.id === driveId) return;

      setIsLoading(true);
      setCurrentDrive(selectedDrive);
      setSearchText("");
      setCurrentFolder(null);
      setCurrentFolderItem(null);
      setBreadcrumbs([{ id: "root", name: selectedDrive.name }]);

      try {
        const result = await searchFiles("", selectedDrive.id);
        setItems(result.items);
        setNextLink(result.nextLink);
      } catch (error) {
        console.error("Drive change error:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [drives, currentDrive],
  );

  // Load more items (pagination)
  const handleLoadMore = useCallback(async () => {
    if (!nextLink) return;

    try {
      const result = await loadNextPage(nextLink);
      setItems((prevItems) => [...prevItems, ...result.items]);
      setNextLink(result.nextLink);
    } catch (error) {
      console.error("Load more error:", error);
    }
  }, [nextLink]);

  // Delete a file or folder
  const handleDelete = useCallback(async (item: DriveItem) => {
    const itemType = item.folder ? "Directory" : "File";
    const confirmed = await confirmAlert({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${item.name}"?`,
      icon: { source: Icon.Trash },
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const success = await deleteFile(item);
      if (success) {
        setItems((prevItems) => prevItems.filter((i) => i.id !== item.id));
      }
    }
  }, []);

  // Download a file
  const handleDownload = useCallback(async (item: DriveItem) => {
    await downloadFile(item);
  }, []);

  // Reveal in browser
  const handleReveal = useCallback(async (item: DriveItem) => {
    const parentUrl = await getParentFolderUrl(item);
    await open(parentUrl);
  }, []);

  // Create share link
  const handleCreateShareLink = useCallback(
    async (item: DriveItem, scope: "anonymous" | "organization", expirationDays?: number) => {
      const { sharePermission } = getPreferenceValues<Preferences>();
      await createShareLink(item, sharePermission, scope, expirationDays);
    },
    [],
  );

  // Reload after upload
  const handleUploadComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      if (currentFolder) {
        const result = await getFolderContents(currentFolder.id, currentDrive?.id);
        setItems(result.items);
        setNextLink(result.nextLink);
      } else {
        const result = await searchFiles("", currentDrive?.id);
        setItems(result.items);
        setNextLink(result.nextLink);
      }
    } catch (error) {
      console.error("Reload after upload error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder, currentDrive]);

  // Organize drives for dropdown
  const { oneDriveDrives, sharepointSites } = useMemo(() => {
    const oneDrive: Drive[] = [];
    const sites: { [key: string]: Drive[] } = {};

    drives.forEach((drive) => {
      if (drive.siteDisplayName) {
        if (!sites[drive.siteDisplayName]) {
          sites[drive.siteDisplayName] = [];
        }
        sites[drive.siteDisplayName].push(drive);
      } else {
        oneDrive.push(drive);
      }
    });

    const sortedSites = Object.entries(sites).sort(([nameA], [nameB]) => nameA.localeCompare(nameB));

    return {
      oneDriveDrives: oneDrive,
      sharepointSites: sortedSites,
    };
  }, [drives]);

  const handleSortChange = useCallback((field: SortConfig["field"]) => {
    setSortConfig({ field, direction: "desc" });
    LocalStorage.setItem("sortPreference", field);
  }, []);

  return {
    // State
    isLoading,
    searchText,
    items,
    currentFolder,
    currentDrive,
    nextLink,
    installedOfficeApps,
    oneDriveDrives,
    sharepointSites,
    sortConfig,

    // Actions
    setSearchText,
    navigateDown,
    navigateUp,
    handleDriveChange,
    handleLoadMore,
    handleDelete,
    handleDownload,
    handleReveal,
    handleCreateShareLink,
    handleUploadComplete,
    handleSortChange,
  };
}
