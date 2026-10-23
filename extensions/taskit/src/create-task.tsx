import {
  Action,
  ActionPanel,
  Form,
  LaunchProps,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { messageFrom, taskit } from "./auth";
import { RequireSignIn } from "./session";
import { createTask } from "./tasks";
import { useLists } from "./task-actions";

export default function Command(
  props: LaunchProps<{ arguments: { text?: string } }>,
) {
  const text = props.arguments?.text?.trim() ?? "";
  return (
    <RequireSignIn>
      {text ? <QuickCreate text={text} /> : <CreateForm />}
    </RequireSignIn>
  );
}

function QuickCreate({ text }: { text: string }) {
  const created = usePromise(
    async (sentence: string) => {
      const api = await taskit();
      const task = await createTask(api, { text: sentence });
      await showHUD(`Created "${task.title}"`);
      await popToRoot();
      return task;
    },
    [text],
  );

  if (created.error) {
    return (
      <List>
        <List.EmptyView
          title="Couldn't create task"
          description={created.error.message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={() => void created.revalidate()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return <List isLoading={created.isLoading} />;
}

function CreateForm() {
  const lists = useLists();
  const [busy, setBusy] = useState(false);

  return (
    <Form
      isLoading={lists.isLoading || busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            onSubmit={async (values) => {
              const text = String(values.text ?? "").trim();
              const list = String(values.list ?? "inbox");
              if (!text) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a task",
                });
                return;
              }
              setBusy(true);
              try {
                const api = await taskit();
                const task = await createTask(api, {
                  text,
                  list: list === "inbox" ? undefined : list,
                });
                await showHUD(`Created "${task.title}"`);
                await popToRoot();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Couldn't create task",
                  message: messageFrom(error),
                });
              } finally {
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
        placeholder="Buy milk tomorrow #errands ~30m !!"
      />
      <Form.Dropdown id="list" title="List" defaultValue="inbox">
        <Form.Dropdown.Item value="inbox" title="Inbox" />
        {(lists.data ?? [])
          .filter((list) => list.id !== "inbox")
          .map((list) => (
            <Form.Dropdown.Item
              key={list.id}
              value={list.id}
              title={list.name}
            />
          ))}
      </Form.Dropdown>
      <Form.Description
        title="Syntax"
        text="#tag   @today   @tomorrow   ~30m   !! priority"
      />
    </Form>
  );
}
