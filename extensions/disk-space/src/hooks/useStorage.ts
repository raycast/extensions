import { useMemo, useState } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import {
  DriveTypeFilter,
  StorageDrive,
  StorageOverview,
} from "../types/storage";
import {
  getStorageProvider,
  calculateOverview,
} from "../services/storage-factory";

export interface UseStorageOptions {
  forceMock?: boolean;
}

export interface UseStorageResult {
  drives: StorageDrive[];
  allDrives: StorageDrive[];
  overview: StorageOverview | null;
  isLoading: boolean;
  error?: Error;
  filter: DriveTypeFilter;
  setFilter: (filter: DriveTypeFilter) => void;
  searchText: string;
  setSearchText: (text: string) => void;
  isShowingDetail: boolean;
  setIsShowingDetail: (showing: boolean) => void;
  toggleDetail: () => void;
  revalidate: () => void;
  ejectDriveOptimistic: (driveId: string) => void;
}

/**
 * Sorts drives deterministically:
 * 1. System drive first
 * 2. Category order: internal < removable < network < virtual < optical < unknown
 * 3. Drive letter alphabetical, then display name
 */
export function sortDrives(drives: StorageDrive[]): StorageDrive[] {
  return [...drives].sort((a, b) => {
    // 1. System drive first
    if (a.isSystemDrive && !b.isSystemDrive) return -1;
    if (!a.isSystemDrive && b.isSystemDrive) return 1;

    // 2. Category hierarchy
    const categoryOrder: Record<string, number> = {
      internal: 1,
      removable: 2,
      network: 3,
      virtual: 4,
      optical: 5,
      unknown: 6,
    };
    const catA = categoryOrder[a.category] || 99;
    const catB = categoryOrder[b.category] || 99;
    if (catA !== catB) return catA - catB;

    // 3. Drive letter or display name alphabetical
    if (a.driveLetter && b.driveLetter) {
      return a.driveLetter.localeCompare(b.driveLetter);
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Filters drives by category filter and search query.
 */
export function filterAndSearchDrives(
  drives: StorageDrive[],
  filter: DriveTypeFilter,
  searchQuery: string,
): StorageDrive[] {
  return drives.filter((drive) => {
    // Category filtering
    if (filter !== "all") {
      if (filter === "internal" && drive.category !== "internal") return false;
      if (filter === "removable" && drive.category !== "removable")
        return false;
      if (filter === "network" && drive.category !== "network") return false;
      if (
        filter === "virtual" &&
        drive.category !== "virtual" &&
        drive.category !== "optical"
      )
        return false;
    }

    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const letter = (drive.driveLetter || "").toLowerCase();
      const name = (drive.volumeName || "").toLowerCase();
      const display = (drive.displayName || "").toLowerCase();
      const model = (drive.model || "").toLowerCase();
      const fs = (drive.fileSystem || "").toLowerCase();
      const path = (drive.networkPath || drive.mountPoint || "").toLowerCase();
      const categoryDesc = (drive.driveTypeDescription || "").toLowerCase();

      return (
        letter.includes(q) ||
        name.includes(q) ||
        display.includes(q) ||
        model.includes(q) ||
        fs.includes(q) ||
        path.includes(q) ||
        categoryDesc.includes(q)
      );
    }

    return true;
  });
}

/**
 * Custom React hook for high-performance zero-latency storage state management in Raycast.
 */
export function useStorage(options?: UseStorageOptions): UseStorageResult {
  const provider = useMemo(
    () => getStorageProvider(options),
    [options?.forceMock],
  );

  const [filter, setFilter] = useState<DriveTypeFilter>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [isShowingDetail, setIsShowingDetail] = useCachedState<boolean>(
    "storage-space-show-detail",
    false,
  );

  const {
    data: rawDrives,
    isLoading,
    error,
    revalidate,
    mutate,
  } = useCachedPromise(async () => {
    const drives = await provider.getDrives();
    return sortDrives(drives);
  }, []);

  const allDrives = useMemo(() => rawDrives || [], [rawDrives]);

  const filteredDrives = useMemo(() => {
    return filterAndSearchDrives(allDrives, filter, searchText);
  }, [allDrives, filter, searchText]);

  const overview = useMemo(() => {
    if (allDrives.length === 0) return null;
    return calculateOverview(allDrives);
  }, [allDrives]);

  const toggleDetail = () => {
    setIsShowingDetail((prev) => !prev);
  };

  const ejectDriveOptimistic = (driveId: string) => {
    mutate(Promise.resolve(allDrives.filter((d) => d.id !== driveId)), {
      optimisticUpdate: (prev) =>
        prev ? prev.filter((d) => d.id !== driveId) : [],
    });
  };

  return {
    drives: filteredDrives,
    allDrives,
    overview,
    isLoading,
    error,
    filter,
    setFilter,
    searchText,
    setSearchText,
    isShowingDetail,
    setIsShowingDetail,
    toggleDetail,
    revalidate,
    ejectDriveOptimistic,
  };
}
