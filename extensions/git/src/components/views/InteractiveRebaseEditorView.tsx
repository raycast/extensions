import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Commit, RebaseAction, RebasePlanItem } from "../../types";
import { NavigationContext, RepositoryContext } from "../../open-repository";

/**
 * Interactive rebase editor view.
 * Displays commits from the selected commit to HEAD and allows setting actions and reordering.
 */
export default function InteractiveRebaseEditorView(
  context: RepositoryContext & NavigationContext & { startFromCommit: string },
) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [plan, setPlan] = useState<Record<string, RebasePlanItem>>({});

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const list = await context.gitManager.getCommitsSince(context.startFromCommit);
        setCommits(list);

        // Default plan: pick all
        const initialPlan: Record<string, RebasePlanItem> = {};
        for (const c of list) {
          initialPlan[c.hash] = { hash: c.hash, action: "pick" };
        }
        setPlan(initialPlan);
      } catch {
        // Git error has been surfaced by GitManager
      } finally {
        setIsLoading(false);
      }
    })();
  }, [context.gitManager.repoPath, context.startFromCommit]);

  const setAction = (hash: string, action: RebaseAction, newMessage?: string) => {
    setPlan((prev) => ({ ...prev, [hash]: { ...prev[hash], action, newMessage } }));
  };

  const moveCommit = (hash: string, direction: "up" | "down") => {
    setCommits((prev) => {
      const index = prev.findIndex((c) => c.hash === hash);
      if (index === -1) return prev;
      const newIndex = direction === "down" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const cloned = prev.slice();
      const [item] = cloned.splice(index, 1);
      cloned.splice(newIndex, 0, item);
      return cloned;
    });
  };

  const performRebase = async () => {
    const confirmed = await confirmAlert({
      title: "Are you sure you want to rebase?",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Rebase",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      await showToast({ style: Toast.Style.Animated, title: "Rebasing..." });
      const planList: RebasePlanItem[] = commits.map((c) => plan[c.hash]);
      await context.gitManager.interactiveRebase(context.startFromCommit, planList);
      await showToast({ style: Toast.Style.Success, title: "Rebase completed" });
      context.branches.revalidate();
      context.status.revalidate();
      pop();
    } catch {
      pop();
      context.branches.revalidate();
      context.status.revalidate();
      context.navigateTo("status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Interactive Rebase" filtering={false}>
      {[...commits].reverse().map((commit) => (
        <List.Item
          key={commit.hash}
          title={plan[commit.hash]?.newMessage ?? commit.message}
          accessories={[
            {
              text: { value: commit.author },
              tooltip: commit.authorEmail,
            },
            {
              text: { value: commit.date.toRelativeDateString() },
              tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(commit.date),
            },
          ]}
          icon={(() => {
            switch (plan[commit.hash]?.action) {
              case "pick":
                return { value: { source: Icon.Dot, tintColor: Color.Green }, tooltip: "Pick: Use this commit" };
              case "reword":
                return {
                  value: { source: Icon.Message, tintColor: Color.Yellow },
                  tooltip: "Reword: Edit the commit message",
                };
              case "edit":
                return { value: { source: Icon.Pencil, tintColor: Color.Yellow }, tooltip: "Edit: Stop for amending" };
              case "drop":
                return { value: { source: Icon.Trash, tintColor: Color.Red }, tooltip: "Drop: Remove commit" };
              case "squash":
                return {
                  value: { source: Icon.ArrowDown, tintColor: Color.Blue },
                  tooltip: "Squash: Meld commit into previous one and keep message",
                };
              case "fixup":
                return {
                  value: { source: Icon.Download, tintColor: Color.SecondaryText },
                  tooltip: "Fixup: Meld commit into previous one and discard message",
                };
            }
          })()}
          actions={
            <ActionPanel>
              <Action
                title="Pick"
                icon={{ source: Icon.Dot, tintColor: Color.Green }}
                onAction={() => setAction(commit.hash, "pick")}
              />
              {/* Separate Section for prevent triggering on cmd + enter */}
              <ActionPanel.Section>
                <Action.Push
                  title="Reword"
                  icon={{ source: Icon.Message, tintColor: Color.Yellow }}
                  target={
                    <RewordForm
                      commit={commit}
                      initialMessage={plan[commit.hash]?.newMessage ?? commit.message}
                      onSubmit={(newMessage) => setAction(commit.hash, "reword", newMessage)}
                    />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Edit"
                  icon={{ source: Icon.Pencil, tintColor: Color.Yellow }}
                  onAction={() => setAction(commit.hash, "edit")}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title="Drop"
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  onAction={() => setAction(commit.hash, "drop")}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action
                  title="Squash"
                  icon={{ source: Icon.ArrowDown, tintColor: Color.Blue }}
                  onAction={() => setAction(commit.hash, "squash")}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action
                  title="Fixup"
                  icon={{ source: Icon.Download, tintColor: Color.SecondaryText }}
                  onAction={() => setAction(commit.hash, "fixup")}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Reorder">
                <Action
                  title="Move up"
                  icon={Icon.ChevronUp}
                  onAction={() => moveCommit(commit.hash, "up")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ChevronDown}
                  onAction={() => moveCommit(commit.hash, "down")}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                />
              </ActionPanel.Section>

              <Action
                title="Apply Rebase"
                icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                onAction={performRebase}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function RewordForm({
  commit,
  initialMessage,
  onSubmit,
}: {
  commit: Commit;
  initialMessage: string;
  onSubmit: (msg: string) => void;
}) {
  const [message, setMessage] = useState(initialMessage);
  const { pop } = useNavigation();

  const handleSubmit = () => {
    onSubmit(message.trim());
    pop();
  };

  return (
    <Form
      navigationTitle={`Reword ${commit.message}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Message" onSubmit={handleSubmit} icon={Icon.CheckCircle} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Commit Message"
        value={message}
        onChange={setMessage}
        error={message.trim().length === 0 ? "Required" : undefined}
      />
    </Form>
  );
}
