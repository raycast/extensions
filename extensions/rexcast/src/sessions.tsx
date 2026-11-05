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
import { captureBlock, inspectSession, listSessions, rex, showSession } from "./lib/rex";

const fail = (e: unknown) => showFailureToast(e, { title: "Rex error" });

function Capture({ session, block }: { session: string; block: string }) {
  const { data, isLoading } = useCachedPromise((s: string, b: string) => captureBlock(s, b), [session, block]);
  return <Detail isLoading={isLoading} markdown={"```\n" + (data ?? "") + "\n```"} />;
}

function Windows({ id }: { id: string }) {
  const { data, isLoading, revalidate } = useCachedPromise(inspectSession, [id]);

  const close = async (what: "block" | "window", target: string) => {
    try {
      await rex(what, "close", "-s", id, target);
      revalidate();
    } catch (e) {
      fail(e);
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Tabs and Panes">
      <List.EmptyView icon={Icon.Window} title="No Tabs" description="This session has no tabs or panes." />
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
  const { data, isLoading, revalidate } = useCachedPromise(() => listSessions());
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search sessions…">
      <List.EmptyView
        icon={Icon.Terminal}
        title="No Sessions"
        description="Rex has no open sessions, or the Rex server is not running."
      />
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
                onAction={() => showSession(s.session_id).catch(fail)}
              />
              <Action.Push title="View Tabs and Panes…" icon={Icon.List} target={<Windows id={s.session_id} />} />
              <Action.Push
                title="Rename…"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Refresh}
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
