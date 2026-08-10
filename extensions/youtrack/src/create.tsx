import type { LaunchProps } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";

import { useForm, FormValidation } from "@raycast/utils";
import { useEffect, useState } from "react";
import type { IssueTag, Project } from "./interfaces";
import { prepareFavorites, getTagsToAdd } from "./utils";
import _ from "lodash";
import { loadCache, saveCache } from "./cache";
import { YouTrackApi } from "./api/youtrack-api";

interface Values {
  summary: string;
  description: string;
  projectId: string;
  favorite: string;
  tags: string[];
}

interface State {
  isLoading: boolean;
  projects: Project[];
  tags: IssueTag[];
  mode: "all" | "favorite";
  favoriteProjects: Project[];
  projectDraftError?: string;
}
const openCommandPreferencesAction: Toast.ActionOptions = {
  title: "Open Command Preferences",
  shortcut: {
    modifiers: ["cmd", "shift"],
    key: "o",
  },
  onAction: () => openCommandPreferences(),
};
const openExtensionPreferencesAction: Toast.ActionOptions = {
  title: "Open Extension Preferences",
  shortcut: {
    modifiers: ["cmd", "shift"],
    key: "e",
  },
  onAction: () => openExtensionPreferences(),
};

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const prefs = getPreferenceValues<Preferences.Create>();
  const api = YouTrackApi.getInstance();

  const [state, setState] = useState<State>({
    isLoading: false,
    projects: [],
    favoriteProjects: [],
    tags: [],
    mode: prefs.mode,
  });

  useEffect(() => {
    async function init() {
      setState((previous) => ({ ...previous, isLoading: true }));

      try {
        const tags = await api.fetchTags(Number(prefs.maxTags));
        setState((previous) => ({ ...previous, tags }));
      } catch {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch tags. Check your connection.",
          primaryAction: openExtensionPreferencesAction,
          secondaryAction: openCommandPreferencesAction,
        });
        setState((previous) => ({ ...previous, isLoading: false }));
        popToRoot();
        return;
      }

      if (prefs.mode === "all") {
        try {
          const cache = await loadCache<Project>("youtrack-projects");

          if (cache.length) {
            setState((previous) => ({ ...previous, projects: cache }));
          }

          const projects = await api.fetchProjects(Number(prefs.maxProjects));

          if (cache.length && _.isEqual(cache, projects)) {
            setState((previous) => ({ ...previous, isLoading: false }));
            return;
          }

          setState((previous) => ({ ...previous, projects, isLoading: false }));
          await saveCache<Project>("youtrack-projects", projects);
        } catch {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch projects. Check your connection.",
            primaryAction: openExtensionPreferencesAction,
            secondaryAction: openCommandPreferencesAction,
          });
          setState((previous) => ({ ...previous, isLoading: false }));
          popToRoot();
        }
        return;
      }

      const favorites =
        prefs.favorite
          ?.split(",")
          .map((el) => el.trim())
          .filter(Boolean) ?? [];

      if (!favorites.length) {
        showToast({
          style: Toast.Style.Failure,
          title: "No favorite projects found. Please specify project IDs in command settings",
          primaryAction: openCommandPreferencesAction,
        });
        popToRoot();
        return;
      }

      try {
        const cache = await loadCache<Project>("youtrack-projects");
        const { cached, toFetch } = prepareFavorites(cache, favorites);

        if (props.draftValues?.projectId && !favorites.includes(props.draftValues.projectId)) {
          setState((previous) => ({ ...previous, projectDraftError: "Project in draft is not found!" }));
        }

        const projects = cached;

        if (toFetch.length) {
          const { fetched, errored } = await api.fetchFavorites(toFetch);

          if (!fetched.length && !projects.length) {
            popToRoot();
          } else {
            projects.push(...fetched);
          }

          if (errored.length) {
            showToast({
              style: Toast.Style.Failure,
              title: `Projects not found: ${errored.join(", ")}. Check if favorite IDs are correct`,
              primaryAction: openCommandPreferencesAction,
              secondaryAction: openExtensionPreferencesAction,
            });
          }
        }

        setState((previous) => ({ ...previous, isLoading: false, favoriteProjects: projects }));
        await saveCache("youtrack-projects", projects);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to fetch favorite projects details: ${(err as Error).message}`,
          primaryAction: openCommandPreferencesAction,
          secondaryAction: openExtensionPreferencesAction,
        });
        setState((previous) => ({ ...previous, isLoading: false }));
        popToRoot();
      }
    }

    init();
  }, [api, prefs.favorite, prefs.maxProjects, prefs.maxTags, prefs.mode, props.draftValues?.projectId]);

  const { projects, isLoading, favoriteProjects, projectDraftError, tags, mode } = state;
  const { draftValues } = props;

  const { handleSubmit, itemProps } = useForm<Values>({
    async onSubmit({ summary, description, projectId, favorite, tags: tagsToAdd }) {
      const tags = getTagsToAdd(tagsToAdd, state.tags);

      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating issue..." });

      try {
        const newIssue = { summary, description, project: { id: projectId || favorite }, tags };
        const res = await api.createIssue(newIssue);
        const idReadable = `${res.project?.shortName}-${res.numberInProject}`;
        const url = `${prefs.instance}/issue/${idReadable}`;
        const secondaryActionTitle = prefs.linkAs === "text" ? "Copy issue URL" : "Copy issue URL as markdown";

        popToRoot();

        toast.title = "Issue created";
        toast.message = idReadable;
        toast.style = Toast.Style.Success;
        toast.primaryAction = {
          title: "Open in browser",
          onAction: () => open(url),
          shortcut: {
            modifiers: ["cmd", "shift"],
            key: "o",
          },
        };
        toast.secondaryAction = {
          title: secondaryActionTitle,
          onAction: async () => {
            await showHUD("Copied URL to clipboard");
            return Clipboard.copy(prefs.linkAs === "text" ? url : `[${idReadable}](${url})`);
          },
          shortcut: {
            modifiers: ["cmd", "shift"],
            key: "c",
          },
        };
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create issue";
        toast.message = (err as Error).message;
      }
    },
    initialValues: draftValues,
    validation: { summary: FormValidation.Required },
  });

  return (
    <Form
      enableDrafts
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {mode === "all" ? (
        <Form.Dropdown
          title="Project"
          autoFocus
          placeholder="Select project"
          info={projectDraftError}
          {...itemProps.projectId}
        >
          {projects.map(({ id, name, shortName }) => (
            <Form.Dropdown.Item key={id} value={id} title={name} icon={Icon.Layers} keywords={[shortName]} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Dropdown title="Project" autoFocus info={projectDraftError} {...itemProps.favorite}>
          {favoriteProjects.map(({ id, name, shortName }) => (
            <Form.Dropdown.Item key={id} value={id} title={name} icon={Icon.Star} keywords={[shortName]} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField title="Summary" placeholder="Enter issue summary" {...itemProps.summary} />
      <Form.TextArea title="Description" {...itemProps.description} />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags?.map(({ id, name, color }) => (
          <Form.TagPicker.Item
            key={id}
            value={name}
            title={name}
            icon={{ source: Icon.Tag, tintColor: color.background }}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
