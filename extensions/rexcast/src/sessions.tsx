import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ErrorEmptyView } from "./components/error-view";
import { openSession } from "./lib/open-session";
import { captureTail, inspectSession, listSessions, rex } from "./lib/rex";
import { codeBlock } from "./lib/text";

const fail = (e: unknown) => showFailureToast(e, { title: "Rex error" });

function Capture({ session, block }: { session: string; block: string }) {
  const { data, isLoading, error } = useCachedPromise((s: string, b: string) => captureTail(s, b), [session, block]);
  const markdown = error ? `**Could not read this pane.**\n\n${error.message}` : codeBlock(data ?? "");
  return <Detail isLoading={isLoading} markdown={markdown} />;
}

function Windows({ id }: { id: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(inspectSession, [id]);

  const close = async (what: "block" | "window", target: string) => {
    const label = what === "block" ? "pane" : "tab";
    if (
      !(await confirmAlert({
        title: `Close this ${label}?`,
        message: `The program running in it will be stopped.`,
        primaryAction: {
          title: `Close ${label[0].toUpperCase()}${label.slice(1)}`,
          style: Alert.ActionStyle.Destructive,
        },
      }))
    )
      return;
    try {
      await rex(what, "close", "-s", id, target);
      revalidate();
    } catch (e) {
      fail(e);
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Tabs and Panes">
      {error ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.Window} title="No Tabs" description="This session has no tabs or panes." />
      )}
      {data?.windows.map((w) => (
        <List.Section key={w.window_id} title={w.label + (w.window_id === data.active ? " (active)" : "")}>
          {w.blocks.map((b) => (
            <List.Item
              key={b.block_id}
              icon={Icon.Terminal}
              title={b.label || b.block_id.slice(-8)}
              subtitle={b.flavor}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Output"
                    icon={Icon.Eye}
                    target={<Capture session={id} block={b.block_id} />}
                  />
                  <Action
                    title="Close Pane"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={() => close("block", b.block_id)}
                  />
                  <Action
                    title="Close Tab"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={() => close("window", w.window_id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function Rename({ id, label, done }: { id: string; label: string; done: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            icon={Icon.Pencil}
            onSubmit={async (v: { label: string }) => {
              const name = v.label.trim();
              if (!name) {
                await fail(new Error("The name cannot be empty"));
                return false;
              }
              try {
                await rex("session", "rename", id, name);
                done();
                pop();
              } catch (e) {
                fail(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="label" title="Name" placeholder="my-project" defaultValue={label} />
    </Form>
  );
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => listSessions());
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions…">
      {error ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No Sessions"
          description="Rex is running but has no open sessions."
        />
      )}
      {data?.map((s) => (
        <List.Item
          key={s.session_id}
          icon="extension-icon.png"
          title={s.label}
          accessories={[{ text: s.session_id.slice(-8) }]}
          actions={
            <ActionPanel>
              <Action
                title="Show in Rex"
                icon={Icon.ArrowRight}
                onAction={() => openSession(s.session_id).catch(fail)}
              />
              <Action.Push title="View Tabs and Panes…" icon={Icon.List} target={<Windows id={s.session_id} />} />
              <Action.Push
                title="Rename…"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<Rename id={s.session_id} label={s.label} done={revalidate} />}
              />
              <Action.CopyToClipboard title="Copy ID" icon={Icon.CopyClipboard} content={s.session_id} />
              <Action
                title="Close Session"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      title: `Close “${s.label}”?`,
                      message: "All of its tabs and panes will be closed.",
                      primaryAction: { title: "Close", style: Alert.ActionStyle.Destructive },
                    }))
                  )
                    return;
                  try {
                    await rex("kill", s.session_id);
                    await showToast({ title: "Session closed", style: Toast.Style.Success });
                    revalidate();
                  } catch (e) {
                    fail(e);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
