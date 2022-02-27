import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { Board, Group } from "./lib/models";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { addItem, getGroups } from "./lib/api";
import { getCachedUser } from "./lib/persistence";
import { ErrorView } from "./lib/helpers";

export default function AddItem({ board }: { board: Board }) {
  const [state, setState] = useState<{
    isLoading: boolean;
    board: Board;
    groups: Group[];
    error?: string;
  }>({ isLoading: true, board: board, groups: [] });
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetch() {
      const groups = await fetchGroups(board.id);

      setState((oldState) => ({
        ...oldState,
        groups: groups,
        isLoading: false,
      }));
    }
    fetch();
  }, []);

  const sortedGroups = state.groups
    .slice()
    .sort((g1, g2) =>
      parseFloat(g1.position) < parseFloat(g2.position) ? -1 : 1
    );

  if (state.error) {
    return <ErrorView error={state.error} />;
  } else {
    return (
      <Form
        isLoading={state.isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add item"
              icon={Icon.Plus}
              onSubmit={(values) => storeItem(board.id, values)}
            />
          </ActionPanel>
        }
        navigationTitle={`Add a new item to ${board.name}`}
      >
        <Form.Description
          title="Add a new item"
          text={`You can use this form to add a new item directly to a specific group in "${board.name}"`}
        />

        <Form.TextField
          id="name"
          title="Item name"
          placeholder="New item's name"
        />

        <Form.Dropdown id="group" title="Group">
          {sortedGroups.map((group) => (
            <Form.Dropdown.Item
              value={group.id}
              key={group.id}
              title={group.title}
              icon={{ source: Icon.Dot, tintColor: group.color }}
            />
          ))}
        </Form.Dropdown>
      </Form>
    );
  }

  async function fetchGroups(boardId: number): Promise<Group[]> {
    try {
      return await getGroups(boardId);
    } catch (error) {
      setState((oldState) => ({
        ...oldState,
        error: error as string,
      }));
      showToast(Toast.Style.Failure, `Could not load groups due to ${error}`);
      return Promise.reject();
    }
  }

  async function storeItem(
    boardId: number,
    formValues: Form.Values
  ): Promise<number> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding new item",
    });

    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      const name = formValues["name"];
      const groupId = formValues["group"];

      if (name == undefined || groupId == undefined) {
        throw "Missing required parameters!";
      }

      const itemId = await addItem(boardId, groupId, name);
      const itemLink = await generateItemLink(boardId, itemId);

      if (itemLink) {
        await Clipboard.copy(itemLink);
      }

      setState((oldState) => ({
        ...oldState,
        isLoading: false,
      }));
      toast.style = Toast.Style.Success;
      toast.title = `Successfully added ${name} to ${board.name}`;
      showHUD("🔗 Copied item link to clipboard");
      pop();
      return itemId;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not add new item due to ${error}`;
      setState((oldState) => ({
        ...oldState,
        isLoading: false,
      }));
      return Promise.reject();
    }
  }

  async function generateItemLink(
    boardId: number,
    itemId: number
  ): Promise<string | undefined> {
    const cachedUser = await getCachedUser();
    if (cachedUser) {
      return `https://${cachedUser.account.slug}.monday.com/boards/${boardId}/pulses/${itemId}`;
    }
  }
}
