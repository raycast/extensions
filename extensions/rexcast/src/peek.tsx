import { Action, ActionPanel, Detail, Icon, LaunchProps, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { captureBlock, inspectSession, listSessions, showSession } from "./lib/rex";

const LINES = 40;

function Peek({ id, label, nested }: { id: string; label: string; nested: boolean }) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (s: string) => {
      const blocks = (await inspectSession(s)).windows.flatMap((w) =>
        w.blocks.filter((b) => b.flavor?.startsWith("com.superlogical.terminal")),
      );
      return Promise.all(
        blocks.map(async (b) => ({
          name: b.label || b.block_id.slice(-8),
          screen: (await captureBlock(s, b.block_id).catch(() => "")).split("\n").slice(-LINES).join("\n"),
        })),
      );
    },
    [id],
  );

  const markdown = (data ?? []).map((b) => `### ${b.name}\n\`\`\`\n${b.screen}\n\`\`\``).join("\n\n");
  return (
    <Detail
      isLoading={isLoading}
      // Only nested screens may set a navigation title.
      navigationTitle={nested ? label : undefined}
      markdown={markdown || (isLoading ? "" : `# ${label}\n\nNo terminal panes in this session.`)}
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action
            title="Show in Rex"
            icon={Icon.ArrowRight}
            onAction={() => showSession(id).catch((e) => showFailureToast(e, { title: "Could not show the session" }))}
          />
        </ActionPanel>
      }
    />
  );
}

function SessionList() {
  const { data, isLoading } = useCachedPromise(() => listSessions());
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
          icon={Icon.Eye}
          title={s.label}
          actions={
            <ActionPanel>
              <Action.Push
                title="Peek at Screen"
                icon={Icon.Eye}
                target={<Peek id={s.session_id} label={s.label} nested />}
              />
              <Action
                title="Show in Rex"
                icon={Icon.ArrowRight}
                onAction={() =>
                  showSession(s.session_id).catch((e) => showFailureToast(e, { title: "Could not show the session" }))
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command(props: LaunchProps<{ launchContext: { session: string; label: string } }>) {
  const ctx = props.launchContext;
  // Launched from the menu bar: open the chosen session directly.
  return ctx?.session ? <Peek id={ctx.session} label={ctx.label} nested={false} /> : <SessionList />;
}
