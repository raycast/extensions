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
import { useState } from "react";
import { addItem, getGroups } from "./lib/api";
import { getCachedUser } from "./lib/persistence";
import { ErrorView } from "./lib/helpers";
import { FormValidation, useForm, usePromise } from "@raycast/utils";

export default function AddItem({ board }: { board: Board }) {
  const [state, setState] = useState<{
    isLoading: boolean;
    board: Board;
    groups: Group[];
    error?: string;
  }>({ isLoading: false, board: board, groups: [] });
  const { pop } = useNavigation();

  usePromise(async () => await fetchGroups(board.id), [], {
    onWillExecute() {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
    },
    onData(data) {
      setState((oldState) => ({
        ...oldState,
        groups: data,
        isLoading: false,
      }));
    },
    onError(error) {
      setState((oldState) => ({
        ...oldState,
        error: `${error}`,
        isLoading: false,
      }));
    },
  });

  const sortedGroups = state.groups
    .slice()
    .sort((g1, g2) =>
      parseFloat(g1.position) < parseFloat(g2.position) ? -1 : 1
    );

  type FormValues = {
    name: string;
    group: string;
  };
  const { itemProps, handleSubmit } = useForm<FormValues>({
    onSubmit(values) {
      storeItem(board.id, values);
    },
    validation: {
      name: FormValidation.Required,
      group: FormValidation.Required,
    },
  });

  if (state.error) {
    return <ErrorView error={state.error} />;
  } else {
    return (
      <Form
        isLoading={state.isLoading}
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Add Item"
              icon={Icon.Plus}
              onSubmit={handleSubmit}
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
          {...itemProps.name}
          title="Item name"
          placeholder="New item's name"
        />

        <Form.Dropdown {...itemProps.group} title="Group">
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
    formValues: FormValues
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

      const name = formValues.name;
      const groupId = formValues.group;

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
      return -1;
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
