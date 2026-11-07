import { Action, ActionPanel, Detail, Icon, LaunchProps, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ErrorEmptyView } from "./components/error-view";
import { openSession } from "./lib/open-session";
import { captureTail, inspectSession, listSessions } from "./lib/rex";
import { codeBlock, lastLines } from "./lib/text";

const LINES = 40;

type PaneView = { name: string; text?: string; error?: string };

function Peek({ id, label, nested }: { id: string; label: string; nested: boolean }) {
  const { data, isLoading, revalidate } = useCachedPromise(
    async (s: string): Promise<PaneView[]> => {
      const blocks = (await inspectSession(s)).windows.flatMap((w) =>
        w.blocks.filter((b) => b.flavor?.startsWith("com.superlogical.terminal")),
      );
      return Promise.all(
        blocks.map(async (b): Promise<PaneView> => {
          const name = b.label || b.block_id.slice(-8);
          try {
            // Only the end of the pane is read: a busy pane can hold tens of MiB of history.
            return { name, text: lastLines(await captureTail(s, b.block_id), LINES) };
          } catch (e) {
            return { name, error: e instanceof Error ? e.message : String(e) };
          }
        }),
      );
    },
    [id],
  );

  const markdown = (data ?? [])
    .map((p) => `### ${p.name}\n${p.error ? `**Could not read this pane:** ${p.error}` : codeBlock(p.text ?? "")}`)
    .join("\n\n");
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
            onAction={() => openSession(id).catch((e) => showFailureToast(e, { title: "Could not show the session" }))}
          />
        </ActionPanel>
      }
    />
  );
}

function SessionList() {
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
                  openSession(s.session_id).catch((e) => showFailureToast(e, { title: "Could not show the session" }))
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
