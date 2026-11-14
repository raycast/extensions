import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { addTitleToList } from "../lib/list-mutations";
import { fetchAllLists } from "../tools/list-api";

/**
 * "Add to List…": the user's personal lists, read when the submenu opens. Adding a title already on the list
 * says so instead of reporting a success.
 */
export const AddToListActions = ({
  kind,
  traktId,
  title,
}: {
  kind: "movies" | "shows";
  traktId: number;
  title: string;
}) => {
  const { data, isLoading, revalidate } = useCachedPromise(async () => (await fetchAllLists()).lists, [], {
    execute: false,
    failureToastOptions: { title: "Could not read your lists" },
  });

  const add = async (list: NonNullable<typeof data>[number]) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Adding to "${list.name}"` });
    try {
      const added = await addTitleToList(list, kind, traktId);
      toast.style = Toast.Style.Success;
      toast.title = added ? `Added "${title}" to "${list.name}"` : `"${title}" is already on "${list.name}"`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = (error as Error).message;
    }
  };

  return (
    <ActionPanel.Submenu title="Add to List…" icon={Icon.List} isLoading={isLoading} onOpen={revalidate}>
      {data?.length === 0 && <Action title="No Personal Lists" icon={Icon.Info} />}
      {data?.map((list) => (
        <Action key={list.ids.trakt} title={list.name} icon={Icon.List} onAction={() => add(list)} />
      ))}
    </ActionPanel.Submenu>
  );
};
