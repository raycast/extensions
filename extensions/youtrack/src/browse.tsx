import { useEffect, useState } from "react";
import { List, showToast, getPreferenceValues, Toast } from "@raycast/api";
import { ReducedIssue, ReducedProject, Youtrack } from "youtrack-rest-client";
import { IssueListItem } from "./components";

interface Preferences {
  instance: string;
  token: string;
  query: string;
  maxIssues: string;
}

interface State {
  isLoading: boolean;
  items: ReducedIssue[];
  projects: ReducedProject[];
  project: string | null;
  error?: Error;
}

// noinspection JSUnusedGlobalSymbols
export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const query = prefs.query;
  const yt = new Youtrack({
    baseUrl: prefs.instance,
    token: prefs.token,
  });
  const [state, setState] = useState<State>({ isLoading: true, items: [], projects: [], project: null });

  if (state.projects.length == 0) {
    yt.projects.all().then((projects: ReducedProject[]) => {
      setState((previous) => ({
        ...previous,
        projects: projects,
        isLoading: false,
      }));
    });
  }

  useEffect(() => {
    if (!state.project) {
      setState((previous) => ({ ...previous, project: state.projects[0]?.shortName ?? "QD" }));
    }

    async function fetchIssues() {
      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        const feed = await yt.issues.search(query, { $top: Number(prefs.maxIssues) });
        setState((previous) => ({ ...previous, items: feed, isLoading: false }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
          items: [],
        }));
      }
    }

    fetchIssues();
  }, [state.projects]);

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading issues",
        message: state.error.message,
      });
    }
  }, [state.error]);

  showToast({
    style: Toast.Style.Success,
    title: prefs.instance,
    message: prefs.query,
  });

  return (
    <List isLoading={(!state.items && !state.error) || state.isLoading}>
      {state.items?.map((item, index) => (
        <IssueListItem key={item.id} item={item} index={index} instance={prefs.instance} />
      ))}
    </List>
  );
}
