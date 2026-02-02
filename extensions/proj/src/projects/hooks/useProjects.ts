// src/projects/hooks/useProjects.ts
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  confirmAlert,
  Alert,
  open,
  trash,
} from "@raycast/api";
import {
  findProjects,
  Project,
  getRandomIconColor,
  detectLanguage,
  extractGitOrg,
} from "../../utils";
import {
  loadAllSettings,
  saveProjectSettings,
  deleteProjectSettings,
  deleteCustomIcon,
  clearProjectIde,
} from "../../settings";
import { loadSources } from "../../sources";
import { getAllCollections } from "../../collections";
import { parseSearchQuery, matchesSearch } from "../../search";
import { updateLastOpened, isRecentProject } from "../../recency";
import { isValidIde, LANGUAGE_OPTIONS } from "../constants";
import type {
  ProjectWithSettings,
  GroupingMode,
  SearchSuggestion,
  GroupedSection,
} from "../types";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [grouping, setGrouping] = useState<GroupingMode>("collection");
  const [isGlobalIdeValid, setIsGlobalIdeValid] = useState(true);

  const preferences = getPreferenceValues<Preferences>();

  const loadProjects = useCallback(async () => {
    try {
      setIsGlobalIdeValid(
        preferences.ide ? isValidIde(preferences.ide.path) : false,
      );

      const sources = loadSources();
      const allSettings = loadAllSettings();

      const seenPaths = new Set<string>();
      const foundProjects: Project[] = [];

      for (const source of sources) {
        const scanned = findProjects(source.path, source.depth);
        for (const project of scanned) {
          if (!seenPaths.has(project.path)) {
            seenPaths.add(project.path);
            foundProjects.push(project);
          }
        }
      }
      foundProjects.sort((a, b) => a.name.localeCompare(b.name));

      const discoveredPaths = new Set(foundProjects.map((p) => p.path));

      const projectsWithSettings: ProjectWithSettings[] = foundProjects.map(
        (project) => {
          const existingSettings = allSettings[project.path] || {};

          if (!existingSettings.iconColor) {
            const newColor = getRandomIconColor();
            const updatedSettings = {
              ...existingSettings,
              iconColor: newColor,
            };
            saveProjectSettings(project.path, updatedSettings);
            return {
              ...project,
              collections: existingSettings.collections || [],
              lastOpened: existingSettings.lastOpened,
              detectedLang: detectLanguage(project.path),
              gitOrg: extractGitOrg(project.path),
              missing: false,
              hasInvalidIde: existingSettings.ide?.path
                ? !isValidIde(existingSettings.ide.path)
                : false,
              settings: updatedSettings,
            };
          }

          return {
            ...project,
            collections: existingSettings.collections || [],
            lastOpened: existingSettings.lastOpened,
            detectedLang: detectLanguage(project.path),
            gitOrg: extractGitOrg(project.path),
            missing: false,
            hasInvalidIde: existingSettings.ide?.path
              ? !isValidIde(existingSettings.ide.path)
              : false,
            settings: existingSettings,
          };
        },
      );

      for (const [savedPath, savedSettings] of Object.entries(allSettings)) {
        if (!discoveredPaths.has(savedPath)) {
          const pathParts = savedPath.split("/");
          const projectName = pathParts[pathParts.length - 1] || savedPath;

          projectsWithSettings.push({
            name: projectName,
            path: savedPath,
            relativePath: savedPath,
            collections: savedSettings.collections || [],
            lastOpened: savedSettings.lastOpened,
            missing: true,
            hasInvalidIde: savedSettings.ide?.path
              ? !isValidIde(savedSettings.ide.path)
              : false,
            settings: savedSettings,
          });
        }
      }

      projectsWithSettings.sort((a, b) => {
        if (a.missing !== b.missing) {
          return a.missing ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      });

      setProjects(projectsWithSettings);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to scan projects",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [preferences.ide?.path]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    if (!searchText) return projects;
    const query = parseSearchQuery(searchText);
    return projects.filter((p) => matchesSearch(p, query));
  }, [projects, searchText]);

  const collectionMap = useMemo(() => {
    const map = new Map<
      string,
      { name: string; icon?: string; color?: string }
    >();
    getAllCollections()
      .filter((c) => c.type === "manual")
      .forEach((c) =>
        map.set(c.id, { name: c.name, icon: c.icon, color: c.color }),
      );
    return map;
  }, []);

  const searchSuggestions = useMemo((): SearchSuggestion[] => {
    if (!searchText) return [];

    const tokens = searchText.split(/\s+/);
    const lastToken = tokens[tokens.length - 1] || "";
    const prefix = tokens.slice(0, -1).join(" ");
    const prefixWithSpace = prefix ? prefix + " " : "";

    if (lastToken.startsWith("#") && lastToken.length >= 1) {
      const partial = lastToken.slice(1).toLowerCase();
      const collections = getAllCollections();
      const suggestions: SearchSuggestion[] = [];

      const specials = [
        { name: "recent", label: "Recent", icon: Icon.Clock },
        { name: "stale", label: "Stale", icon: Icon.ExclamationMark },
        { name: "month", label: "This Month", icon: Icon.Calendar },
        {
          name: "uncategorized",
          label: "Uncategorized",
          icon: Icon.QuestionMark,
        },
      ];

      for (const s of specials) {
        if (
          s.name.includes(partial) ||
          s.label.toLowerCase().includes(partial)
        ) {
          suggestions.push({
            id: `suggestion-#${s.name}`,
            title: `#${s.name}`,
            subtitle: s.label,
            icon: s.icon,
            filter: `${prefixWithSpace}#${s.name}`,
          });
        }
      }

      for (const c of collections.filter((c) => c.type === "manual")) {
        if (c.name.toLowerCase().includes(partial)) {
          suggestions.push({
            id: `suggestion-#${c.name}`,
            title: `#${c.name.toLowerCase().replace(/\s+/g, "-")}`,
            subtitle: c.name,
            icon: c.icon
              ? (Icon[c.icon as keyof typeof Icon] as Icon)
              : Icon.Folder,
            filter: `${prefixWithSpace}#${c.name.toLowerCase().replace(/\s+/g, "-")}`,
          });
        }
      }

      return suggestions.slice(0, 5);
    }

    if (lastToken.startsWith("lang:")) {
      const partial = lastToken.slice(5).toLowerCase();
      const suggestions: SearchSuggestion[] = [];

      for (const lang of LANGUAGE_OPTIONS) {
        const alias = "alias" in lang ? lang.alias : undefined;
        if (
          lang.name.toLowerCase().includes(partial) ||
          lang.value.includes(partial) ||
          alias?.includes(partial)
        ) {
          suggestions.push({
            id: `suggestion-lang:${lang.value}`,
            title: `lang:${lang.value}`,
            subtitle: lang.name + (alias ? ` (${alias})` : ""),
            icon: Icon.Code,
            filter: `${prefixWithSpace}lang:${lang.value}`,
          });
        }
      }

      return suggestions.slice(0, 5);
    }

    if (lastToken.startsWith("org:")) {
      const partial = lastToken.slice(4).toLowerCase();
      const orgs = new Set<string>();
      for (const p of projects) {
        if (p.gitOrg && p.gitOrg.toLowerCase().includes(partial)) {
          orgs.add(p.gitOrg);
        }
      }

      return Array.from(orgs)
        .slice(0, 5)
        .map((org) => ({
          id: `suggestion-org:${org}`,
          title: `org:${org}`,
          subtitle: "Git organization",
          icon: Icon.Person,
          filter: `${prefixWithSpace}org:${org}`,
        }));
    }

    return [];
  }, [searchText, projects]);

  const groupedProjects = useMemo((): GroupedSection[] => {
    if (grouping === "flat") {
      return [
        { title: "All Projects", projects: filteredProjects, isAuto: true },
      ];
    }

    if (grouping === "recency") {
      const recent = filteredProjects
        .filter((p) => isRecentProject(p.lastOpened))
        .sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0));
      const rest = filteredProjects.filter(
        (p) => !isRecentProject(p.lastOpened),
      );

      return [
        { title: "Recent", projects: recent, isAuto: true },
        { title: "Other", projects: rest, isAuto: true },
      ].filter((g) => g.projects.length > 0);
    }

    const collections = getAllCollections();
    const manualCollections = collections.filter((c) => c.type === "manual");

    const groups: GroupedSection[] = [];
    const assigned = new Set<string>();

    const recentProjects = filteredProjects
      .filter((p) => isRecentProject(p.lastOpened))
      .sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0));
    if (recentProjects.length > 0) {
      groups.push({ title: "Recent", projects: recentProjects, isAuto: true });
      recentProjects.forEach((p) => assigned.add(p.path));
    }

    for (const collection of manualCollections) {
      const collProjects = filteredProjects.filter(
        (p) => !assigned.has(p.path) && p.collections?.includes(collection.id),
      );
      if (collProjects.length > 0) {
        groups.push({
          title: collection.name,
          projects: collProjects,
          isAuto: false,
          collectionIcon: collection.icon,
          collectionColor: collection.color,
        });
        collProjects.forEach((p) => assigned.add(p.path));
      }
    }

    const uncategorized = filteredProjects.filter((p) => !assigned.has(p.path));
    if (uncategorized.length > 0) {
      groups.push({
        title: "Uncategorized",
        projects: uncategorized,
        isAuto: true,
      });
    }

    return groups;
  }, [filteredProjects, grouping]);

  const handleOpen = useCallback(
    async (project: ProjectWithSettings) => {
      if (project.hasInvalidIde && project.settings.ide) {
        const ideName = project.settings.ide.name;
        const idePath = project.settings.ide.path;

        if (!isGlobalIdeValid) {
          await confirmAlert({
            title: "IDE Not Found",
            message: `"${ideName}" is no longer installed.\n\nPath: ${idePath}\n\nThe default IDE is also not available. Please configure a new IDE in project settings.`,
            primaryAction: {
              title: "Open Project Settings",
            },
          });
          return { action: "openSettings" as const, project };
        }

        const useDefault = await confirmAlert({
          title: "IDE Not Found",
          message: `"${ideName}" is no longer installed.\n\nPath: ${idePath}`,
          primaryAction: {
            title: "Use Default IDE",
          },
          dismissAction: {
            title: "Choose New IDE",
          },
        });

        if (useDefault) {
          clearProjectIde(project.path);
          await updateLastOpened(project.path);
          await open(project.path, preferences.ide?.path);
          loadProjects();
          return { action: "opened" as const };
        } else {
          return { action: "openSettings" as const, project };
        }
      }

      const idePath = project.settings.ide?.path || preferences.ide?.path;
      await updateLastOpened(project.path);
      await open(project.path, idePath);
      loadProjects();
      return { action: "opened" as const };
    },
    [isGlobalIdeValid, preferences.ide?.path, loadProjects],
  );

  const handleDelete = useCallback(
    async (project: ProjectWithSettings) => {
      const confirmed = await confirmAlert({
        title: "Delete Project",
        message: `Are you sure you want to permanently delete "${project.settings.displayName || project.name}"?\n\nThis will delete the entire folder:\n${project.path}\n\nThis action cannot be undone.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        try {
          await trash(project.path);
          if (project.settings.customIcon) {
            deleteCustomIcon(project.settings.customIcon);
          }
          deleteProjectSettings(project.path);
          await showToast({
            style: Toast.Style.Success,
            title: "Project deleted",
            message: project.settings.displayName || project.name,
          });
          loadProjects();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to delete project",
            message: String(error),
          });
        }
      }
    },
    [loadProjects],
  );

  const handleDeleteFromExtension = useCallback(
    async (project: ProjectWithSettings) => {
      const confirmed = await confirmAlert({
        title: "Remove from Extension",
        message: `Remove "${project.settings.displayName || project.name}" from the extension?\n\nThis only removes the saved settings. The project folder (if it exists elsewhere) will not be affected.`,
        primaryAction: {
          title: "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        if (project.settings.customIcon) {
          deleteCustomIcon(project.settings.customIcon);
        }
        deleteProjectSettings(project.path);
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from extension",
          message: project.settings.displayName || project.name,
        });
        loadProjects();
      }
    },
    [loadProjects],
  );

  const handleRelocateProject = useCallback((project: ProjectWithSettings) => {
    return { action: "relocate" as const, project };
  }, []);

  const applySuggestion = useCallback((filter: string) => {
    setSearchText(filter + " ");
  }, []);

  return {
    projects,
    isLoading,
    searchText,
    setSearchText,
    grouping,
    setGrouping,
    isGlobalIdeValid,
    preferences,
    loadProjects,
    filteredProjects,
    collectionMap,
    searchSuggestions,
    groupedProjects,
    handleOpen,
    handleDelete,
    handleDeleteFromExtension,
    handleRelocateProject,
    applySuggestion,
  };
}
