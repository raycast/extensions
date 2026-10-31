import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AskView, FollowUp } from "./ask-view";
import { SessionRow } from "./parse";
import { ago, Group, groupOf, listSessions } from "./sessions";
import { cli } from "./yab";

const TITLES: Record<Group, string> = {
  waiting: "Waiting for You",
  working: "Working",
  outside: "Outside Agents",
  done: "Done",
};

const STATE_WORDS: Record<Group, (r: SessionRow) => string> = {
  waiting: (r) => r.waiting ?? "needs you in Yab",
  working: (r) => `working${ago(r.started) ? `, started ${ago(r.started)}` : ""}`,
  outside: () => "using Yab",
  done: (r) => (r.state === "done" ? `done ${ago(r.finished) ?? ""}`.trim() : r.state),
};

function face(agent: string): { source: Icon; tintColor: Color } {
  if (/codex|chatgpt|openai/i.test(agent)) return { source: Icon.Stars, tintColor: Color.Green };
  if (/cursor/i.test(agent)) return { source: Icon.Terminal, tintColor: Color.PrimaryText };
  return { source: Icon.SpeechBubbleActive, tintColor: Color.Orange };
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(() => listSessions(), [], { keepPreviousData: true });
  const rows = data ?? [];
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search agent sessions…">
      <List.EmptyView
        icon={Icon.SpeechBubble}
        title="No agent work yet"
        description="Ask Yab something and it shows here."
      />
      {(["waiting", "working", "outside", "done"] as Group[]).map((g) => (
        <List.Section key={g} title={TITLES[g]}>
          {rows
            .filter((r) => groupOf(r) === g)
            .map((r) => (
              <List.Item
                key={r.id}
                icon={face(r.agent || r.title)}
                title={r.title || r.prompt || r.id}
                subtitle={r.prompt && r.prompt !== r.title ? r.prompt : undefined}
                accessories={[
                  { text: { value: STATE_WORDS[g](r), color: g === "waiting" ? Color.Orange : undefined } },
                ]}
                actions={
                  <ActionPanel>
                    {g === "done" ? (
                      <Action.Push title="Ask a Follow-Up" icon={Icon.Reply} target={<FollowUp session={r.id} />} />
                    ) : (
                      <Action.Push
                        title="Follow Along"
                        icon={Icon.Eye}
                        target={<AskView prompt="" resume={r.id} title={r.title || r.prompt} />}
                      />
                    )}
                    {g === "working" ? (
                      <Action.Push
                        title="Change of Plan"
                        icon={Icon.Pencil}
                        target={<FollowUp session={r.id} steer />}
                      />
                    ) : null}
                    {g === "working" || g === "waiting" ? (
                      <Action
                        title="Stop"
                        icon={Icon.Stop}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={async () => {
                          const stopped = await cli(["session", "stop", r.id]);
                          await showToast(
                            stopped.code === 0
                              ? { style: Toast.Style.Success, title: "Stopped" }
                              : {
                                  style: Toast.Style.Failure,
                                  title: "Couldn't stop it",
                                  message: stopped.stdout.trim(),
                                },
                          );
                          revalidate();
                        }}
                      />
                    ) : null}
                    <Action.CopyToClipboard title="Copy Session ID" content={r.id} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
