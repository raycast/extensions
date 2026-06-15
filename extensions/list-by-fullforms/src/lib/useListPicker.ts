// Shared scaffolding for every command that asks the user to pick
// a list to act on (Quick Add Entry, Suggest Entry, future ones).
//
// Fetches /api/v1/workspaces + /api/v1/lists in parallel, error-
// toasts on failure (Raycast's standard pattern), groups the lists
// under their parent workspace, and returns the buckets ready to
// feed Form.Dropdown.Section. The two existing commands diverge on
// which lists are pickable — Quick Add Entry filters to writable
// roles (owner/admin/editor) because viewer roles can't reach POST
// /entries (the RPC raises not_authorized) so showing those is a
// UX dead end, Suggest Entry accepts every list the caller can see
// — so the optional `filter` callback parameterises that decision
// at the call site.
//
// Empty-state rendering stays at the call site (a `Detail` with a
// CTA when `total === 0`) because each command's copy differs:
// "no editable lists" vs "no accessible lists". The auto-select-
// first-list useEffect also stays at the call site because it
// needs the caller's useForm setValue.
//
// Ordering preserved end-to-end: workspaces RPC sorts personal-
// first then team alphabetical, lists RPC sorts updated_at desc
// within a workspace. The hook keeps both, so buckets[0].lists[0]
// is reliably "the user's most recently edited list inside their
// primary workspace" — the natural default selection.
//
// Reference stability: the hook intentionally doesn't memoize.
// Inputs are small (a handful of workspaces × a handful of lists)
// and inline filtering/grouping each render is cheap. The
// `filter` callback is captured by identity not memo'd-on, so
// callers can pass inline arrow functions without wrecking a
// memoization cache that wouldn't have helped anyway.

import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { apiBase, authHeaders } from "./api";
import type {
  ListRow,
  ListsResponse,
  Workspace,
  WorkspacesResponse,
} from "./api";

export interface ListBucket {
  workspace: Workspace;
  lists: ListRow[];
}

export interface UseListPickerResult {
  buckets: ListBucket[];
  // Total list count across buckets (after the filter). Used by the
  // caller's empty-state branch — when total is 0 and isLoading is
  // false, render the "no accessible lists" detail instead of an
  // empty Form.Dropdown.
  total: number;
  // Flat filtered list, handy for resolving a selectedList by id
  // (selectedList = lists.find(l => String(l.id) === values.listId)).
  lists: ListRow[];
  isLoading: boolean;
}

export function useListPicker(
  filter?: (list: ListRow) => boolean,
): UseListPickerResult {
  const workspacesQuery = useFetch<WorkspacesResponse>(
    `${apiBase()}/api/v1/workspaces`,
    {
      headers: authHeaders(),
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load workspaces",
          message: error.message,
        });
      },
    },
  );

  const listsQuery = useFetch<ListsResponse>(`${apiBase()}/api/v1/lists`, {
    headers: authHeaders(),
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load lists",
        message: error.message,
      });
    },
  });

  const isLoading = workspacesQuery.isLoading || listsQuery.isLoading;

  const rawLists = listsQuery.data?.lists ?? [];
  const rawWorkspaces = workspacesQuery.data?.workspaces ?? [];

  const lists = filter ? rawLists.filter(filter) : rawLists;
  const buckets: ListBucket[] = rawWorkspaces
    .map((workspace) => ({
      workspace,
      lists: lists.filter((l) => l.workspace_id === workspace.id),
    }))
    .filter((b) => b.lists.length > 0);
  const total = buckets.reduce((n, b) => n + b.lists.length, 0);

  return { buckets, total, lists, isLoading };
}
