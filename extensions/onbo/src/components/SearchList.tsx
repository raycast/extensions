import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
  getPreferenceValues,
  useNavigation,
  open,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import type { RoleListing, RolesAPI } from "../models/RolesAPI";
import type { RoleCategories } from "../models/RoleCategoriesAPI";
import { getSavedRoles, markAsSaved, removeFromSaved, type AppliedRole, saveWithStatus } from "../utils/applications";
import { enhanceJobTitles } from "../utils/enhanceJobTitles";
import { ApplicationStatus, RoleType, toApiSegment } from "../utils/roles";
import { getIconForCategory } from "../utils/icons";
import { formatAddedFromDaysAgo } from "../utils/format";
import NotesView from "./NotesView";

/**
 * Props for the SearchList command.
 * - resource: Which role type to browse (New Grad or Internship).
 * - normalizeCategoryTitle: Optional function to normalize category titles for display in the dropdown.
 */
type SearchCommandProps = {
  resource: RoleType;
  normalizeCategoryTitle?: (title: string) => string;
};

const API_BASE = "https://onbo.dev/api/v1" as const;

/**
 * Pass-through normalizer for category titles when no custom normalizer is provided.
 *
 * @param title - Raw category title from the API.
 * @returns The unchanged title.
 */
const defaultNormalization = (title: string) => title;

/**
 * Transforms a RoleListing from the API into an AppliedRole suitable for local storage,
 * initializing status as "saved" and stamping statusUpdatedAt.
 *
 * @param job - The role listing returned from the API.
 * @param roleType - The current SearchList role type context (New Grad or Internship).
 * @returns An AppliedRole object ready for persistence.
 */
function buildSavedRole(job: RoleListing, roleType: RoleType): AppliedRole {
  const now = new Date().toISOString();
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    role_type: roleType,
    status: "saved",
    statusUpdatedAt: now,
    application_url: job.application_url,
    locations: job.locations,
    is_active: job.is_active,
  };
}

/**
 * SearchList
 *
 * Main command for browsing roles (New Grad or Internship).
 * Features:
 * - Search with pagination and optional category filtering.
 * - Save or remove listings in "My Applications".
 * - Save As with an initial status (Applied, Interviewing, Offer, Rejected).
 * - Auto-save on open/copy based on user preference.
 */
export default function SearchList({ resource, normalizeCategoryTitle = defaultNormalization }: SearchCommandProps) {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [savedJobs, setSavedJobs] = useState<Set<number>>(new Set());
  const [savedById, setSavedById] = useState<Map<number, AppliedRole>>(new Map());
  const { autoSaveOnOpen, jobLinksBrowser } = getPreferenceValues();
  const { push } = useNavigation();

  const {
    isLoading,
    data: rawData,
    pagination,
    error,
  } = useFetch<RolesAPI, RoleListing[]>(
    (options) => {
      const params = new URLSearchParams({
        page: String(options.page + 1),
        q: searchText,
      });
      if (selectedCategory !== "All") {
        params.set("category", selectedCategory);
      }
      return `${API_BASE}/${toApiSegment(resource)}?${params.toString()}`;
    },
    {
      mapResult(result: RolesAPI): { data: RoleListing[]; hasMore: boolean } {
        return {
          data: result.data,
          hasMore: result.page < result.total_pages,
        };
      },
      keepPreviousData: true,
      initialData: [] as RoleListing[],
    },
  );

  const {
    isLoading: isLoadingCategories,
    data: categoriesData,
    error: categoriesError,
  } = useFetch<RoleCategories>(`${API_BASE}/${toApiSegment(resource)}/categories`, {
    keepPreviousData: true,
  });

  useEffect(() => {
    if (error) {
      void showToast({ style: Toast.Style.Failure, title: "Load Failed", message: "Please try again in a moment." });
    }
  }, [error]);

  useEffect(() => {
    if (categoriesError) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Couldn't Load Categories",
        message: "Please try again in a moment.",
      });
    }
  }, [categoriesError]);

  const searchBarAccessory = (
    <List.Dropdown tooltip="Filter by category" onChange={setSelectedCategory} value={selectedCategory}>
      <List.Dropdown.Item title="All Categories" value="All" />
      {!isLoadingCategories &&
        categoriesData?.categories.map((category) => (
          <List.Dropdown.Item key={category.name} title={normalizeCategoryTitle(category.name)} value={category.name} />
        ))}
    </List.Dropdown>
  );

  useEffect(() => {
    /**
     * Loads saved roles from local storage and initializes the in-memory "saved" set.
     * Used on mount to sync local state.
     */
    async function loadAppliedJobs() {
      const applied = await getSavedRoles();
      setSavedJobs(new Set(applied.map((j) => j.id)));
      setSavedById(new Map(applied.map((j) => [j.id, j])));
    }
    void loadAppliedJobs();
  }, []);

  /**
   * Persist a listing as "saved" and update in-memory overlays for instant UI updates.
   *
   * @param job - API listing to save.
   */
  const saveApplicationAndFlag = async (job: RoleListing) => {
    const savedRole = buildSavedRole(job, resource);
    await markAsSaved(savedRole);
    setSavedJobs((prev) => new Set([...prev, job.id]));
    setSavedById((prev) => {
      const next = new Map(prev);
      next.set(job.id, savedRole);
      return next;
    });
  };

  /**
   * Save a listing with an initial status and update overlays; shows a toast on success.
   *
   * @param job - API listing to save.
   * @param status - Initial ApplicationStatus to set.
   */
  const saveJobWithStatus = async (job: RoleListing, status: ApplicationStatus) => {
    await saveWithStatus(job, resource, status);
    setSavedJobs((prev) => new Set([...prev, job.id]));
    setSavedById((prev) => {
      const next = new Map(prev);
      const now = new Date().toISOString();
      next.set(job.id, {
        id: job.id,
        company: job.company,
        role: job.role,
        role_type: resource,
        status,
        statusUpdatedAt: now,
        ...(status === "applied" ? { appliedDate: now } : {}),
        application_url: job.application_url,
        locations: job.locations,
        is_active: job.is_active,
      });
      return next;
    });
    await showToast({
      style: Toast.Style.Success,
      title: `Saved with status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    });
  };

  /**
   * Toggle between saved/removed states, updating storage and in-memory overlays.
   *
   * @param job - API listing to toggle.
   */
  const toggleApplication = async (job: RoleListing) => {
    const isApplied = savedJobs.has(job.id);
    if (isApplied) {
      await removeFromSaved(job.id);
      setSavedJobs((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      setSavedById((prev) => {
        const next = new Map(prev);
        next.delete(job.id);
        return next;
      });
      await showToast({ style: Toast.Style.Failure, title: "Removed from My Applications" });
    } else {
      await saveApplicationAndFlag(job);
      await showToast({ style: Toast.Style.Success, title: "Saved to My Applications" });
    }
  };

  /**
   * Active role listings derived from the fetched data.
   * Filters out inactive listings for display.
   */
  const jobs: RoleListing[] = (rawData ?? []).filter((job): job is RoleListing => (job as RoleListing).is_active);

  return (
    <List
      searchBarPlaceholder={`Search ${resource.toLowerCase()} roles`}
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={searchBarAccessory}
    >
      {enhanceJobTitles(jobs).map((job) => {
        const saved = savedById.get(job.id);
        const isSaved = !!saved;
        const note = saved?.notes?.trim();
        return (
          <List.Item
            key={job.id}
            title={job.displayTitle}
            subtitle={job.company}
            icon={getIconForCategory(job.category)}
            accessories={[
              ...(isSaved
                ? [{ icon: note ? Icon.Pencil : Icon.Bookmark, tooltip: note && note.length > 0 ? note : "Saved" }]
                : []),
              { text: formatAddedFromDaysAgo(job.days_ago) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="View & Share">
                  <Action
                    title="View in Browser"
                    icon={Icon.Globe}
                    onAction={() => {
                      if (autoSaveOnOpen) {
                        saveApplicationAndFlag(job);
                      }
                      open(job.application_url, jobLinksBrowser.bundleId);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Link"
                    content={job.application_url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onCopy={() => {
                      if (autoSaveOnOpen) {
                        saveApplicationAndFlag(job);
                      }
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Quick Actions">
                  <Action
                    title={saved ? "Remove from My Applications" : "Save to My Applications"}
                    icon={saved ? Icon.XMarkCircle : Icon.PlusCircle}
                    onAction={() => toggleApplication(job)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                  <ActionPanel.Submenu
                    title={"Save as"}
                    icon={Icon.Tag}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  >
                    <Action
                      title="Applied"
                      icon={Icon.Circle}
                      onAction={() => saveJobWithStatus(job, "applied")}
                      shortcut={{ modifiers: ["cmd"], key: "2" }}
                    />
                    <Action
                      title="Interviewing"
                      icon={Icon.Clock}
                      onAction={() => saveJobWithStatus(job, "interviewing")}
                      shortcut={{ modifiers: ["cmd"], key: "3" }}
                    />
                    <Action
                      title="Got Offer"
                      icon={Icon.CheckCircle}
                      onAction={() => saveJobWithStatus(job, "offer")}
                      shortcut={{ modifiers: ["cmd"], key: "4" }}
                    />
                    <Action
                      title="Rejected"
                      icon={Icon.XMarkCircle}
                      onAction={() => saveJobWithStatus(job, "rejected")}
                      shortcut={{ modifiers: ["cmd"], key: "5" }}
                    />
                  </ActionPanel.Submenu>
                  {isSaved ? (
                    <Action.Push
                      title={note ? "Edit Note" : "Add Note"}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      icon={Icon.Pencil}
                      target={
                        <NotesView
                          id={job.id}
                          initialNotes={note ?? ""}
                          onSaved={(newNotes) => {
                            setSavedById((prev) => {
                              const next = new Map(prev);
                              const current = next.get(job.id);
                              if (current) next.set(job.id, { ...current, notes: newNotes });
                              return next;
                            });
                          }}
                        />
                      }
                    />
                  ) : (
                    <Action
                      title={"Save with Note"}
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={async () => {
                        await saveApplicationAndFlag(job);
                        push(
                          <NotesView
                            id={job.id}
                            initialNotes=""
                            onSaved={(newNotes) => {
                              setSavedById((prev) => {
                                const next = new Map(prev);
                                const current = next.get(job.id);
                                if (current) next.set(job.id, { ...current, notes: newNotes });
                                return next;
                              });
                            }}
                          />,
                        );
                      }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
