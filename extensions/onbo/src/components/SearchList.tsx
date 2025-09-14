import { Action, ActionPanel, Icon, List, Toast, showToast, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import type { RoleListing, RolesAPI } from "../models/RolesAPI";
import type { RoleCategories } from "../models/RoleCategoriesAPI";
import { getSavedRoles, markAsSaved, removeFromSaved, type AppliedRole } from "../utils/applications";
import { enhanceJobTitles } from "../utils/enhanceJobTitles";
import { RoleType, toApiSegment } from "../utils/roles";
import { getIconForCategory } from "../utils/icons";
import { formatDaysAgo } from "../utils/format";

type SearchCommandProps = {
  resource: RoleType;
  normalizeCategoryTitle?: (title: string) => string;
};

const API_BASE = "https://onbo.dev/api/v1" as const;

const defaultNormalization = (title: string) => title;

function buildSavedRole(job: RoleListing, roleType: RoleType): AppliedRole {
  const now = new Date().toISOString();
  return {
    id: job.id,
    company: job.company,
    role: job.role,
    role_type: roleType,
    status: "saved",
    statusUpdatedAt: now,
    appliedDate: now,
    application_url: job.application_url,
    locations: job.locations,
  };
}

export default function SearchList({ resource, normalizeCategoryTitle = defaultNormalization }: SearchCommandProps) {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [savedJobs, setSavedJobs] = useState<Set<number>>(new Set());
  const { autoSaveOnOpen } = getPreferenceValues();

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
      void showToast({ style: Toast.Style.Failure, title: "Failed to load roles", message: String(error) });
    }
  }, [error]);

  useEffect(() => {
    if (categoriesError) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to load categories",
        message: String(categoriesError),
      });
    }
  }, [categoriesError]);

  const searchBarAccessory = useMemo(
    () => (
      <List.Dropdown tooltip="Filter by category" onChange={setSelectedCategory} value={selectedCategory}>
        <List.Dropdown.Item title="All Categories" value="All" />
        {!isLoadingCategories &&
          categoriesData?.categories.map((category) => (
            <List.Dropdown.Item
              key={category.name}
              title={normalizeCategoryTitle(category.name)}
              value={category.name}
            />
          ))}
      </List.Dropdown>
    ),
    [categoriesData, isLoadingCategories, normalizeCategoryTitle, selectedCategory],
  );

  useEffect(() => {
    async function loadAppliedJobs() {
      const applied = await getSavedRoles();
      setSavedJobs(new Set(applied.map((j) => j.id)));
    }
    void loadAppliedJobs();
  }, []);

  const saveApplicationAndFlag = async (job: RoleListing) => {
    await markAsSaved(buildSavedRole(job, resource));
    setSavedJobs((prev) => new Set([...prev, job.id]));
  };

  const toggleApplication = async (job: RoleListing) => {
    const isApplied = savedJobs.has(job.id);
    if (isApplied) {
      await removeFromSaved(job.id);
      setSavedJobs((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      await showToast({ style: Toast.Style.Failure, title: "Removed from your Applications" });
    } else {
      await saveApplicationAndFlag(job);
      await showToast({ style: Toast.Style.Success, title: "Saved to your Applications" });
    }
  };

  const jobs = (rawData ?? []) as RoleListing[];

  return (
    <List
      searchBarPlaceholder={`Search ${resource} roles`}
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={searchBarAccessory}
    >
      {enhanceJobTitles(jobs).map((job) => {
        const isSaved = savedJobs.has(job.id);
        return (
          <List.Item
            key={job.id}
            title={job.displayTitle}
            subtitle={job.company}
            icon={getIconForCategory(job.category)}
            accessories={[
              ...(isSaved ? [{ icon: Icon.Bookmark, tooltip: "Saved" }] : []),
              { text: formatDaysAgo(job.days_ago) },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Apply Now"
                  url={job.application_url}
                  onOpen={() => {
                    if (autoSaveOnOpen) {
                      saveApplicationAndFlag(job);
                    }
                  }}
                />
                <Action
                  title={isSaved ? "Remove from My Applications" : "Save to My Applications"}
                  icon={isSaved ? Icon.XMarkCircle : Icon.Plus}
                  onAction={() => toggleApplication(job)}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
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
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
