import {
  Action,
  ActionPanel,
  Form,
  LaunchProps,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useRef, useState } from "react";
import { messageFrom, taskit } from "./auth";
import { RequireSignIn } from "./session";
import { createTask } from "./tasks";
import { useLists } from "./task-actions";

export default function Command(
  props: LaunchProps<{ arguments: Arguments.CreateTask }>,
) {
  const text = props.arguments?.text?.trim() ?? "";
  return (
    <RequireSignIn>
      <CreateForm initialText={text} />
    </RequireSignIn>
  );
}

function CreateForm({ initialText }: { initialText: string }) {
  const lists = useLists();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const choices = [...(lists.data ?? [])]
    .filter((list) => list.id !== "inbox")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Form
      isLoading={lists.isLoading || busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            onSubmit={async (values) => {
              if (pending.current) return;
              const text = String(values.text ?? "").trim();
              const list = String(values.list ?? "inbox");
              const listName =
                list === "inbox"
                  ? "Inbox"
                  : (choices.find((item) => item.id === list)?.name ?? "list");
              if (!text) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a task",
                });
                return;
              }
              pending.current = true;
              setBusy(true);
              try {
                const api = await taskit();
                const task = await createTask(api, {
                  text,
                  list: list === "inbox" ? undefined : list,
                });
                await showHUD(`Created "${task.title}" in ${listName}`);
                await popToRoot();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Couldn't create task",
                  message: messageFrom(error),
                });
              } finally {
                pending.current = false;
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Task"
        defaultValue={initialText}
        placeholder="Buy milk tomorrow #errands ~30m !!"
      />
      <Form.Dropdown id="list" title="List" defaultValue="inbox" storeValue>
        <Form.Dropdown.Item value="inbox" title="Inbox" />
        {choices.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} />
        ))}
      </Form.Dropdown>
      {lists.error ? (
        <Form.Description
          title="Lists"
          text="Couldn't load your lists. Inbox still works."
        />
      ) : null}
      <Form.Description
        title="Syntax"
        text="#tag   @today   @tomorrow   ~30m   !! priority"
      />
    </Form>
  );
}
