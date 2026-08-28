import {
  Color,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { complete, isSignedIn, list, reopen } from "./lib/jovida";
import { BUCKET_TITLE, formatWhen, timeBucket, TimeBucket } from "./lib/format";
import { Todo } from "./lib/types";

const BUCKET_ORDER: TimeBucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "future",
  "anytime",
];

export default function TodayMenuBar() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    if (!(await isSignedIn())) return { signedIn: false, todos: [] as Todo[] };
    const res = await list({
      scope: "all",
      status: "pending",
      limit: 100,
      full: true,
    });
    return { signedIn: true, todos: res.todos };
  });

  const signedIn = data?.signedIn === true;
  const todos = data?.todos ?? [];

  // Group into time buckets, sorted by due time within each.
  const groups = new Map<TimeBucket, Todo[]>();
  for (const todo of todos) {
    const bucket = timeBucket(todo.when);
    const arr = groups.get(bucket);
    if (arr) arr.push(todo);
    else groups.set(bucket, [todo]);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.when ?? "").localeCompare(b.when ?? ""));
  }

  const todayCount = groups.get("today")?.length ?? 0;
  const total = todos.length;

  async function completeItem(todo: Todo) {
    try {
      await complete([todo.entry_id]);
      revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "Completed",
        message: todo.title,
        primaryAction: {
          title: "Undo",
          shortcut: { modifiers: ["cmd"], key: "z" },
          onAction: async (t) => {
            await reopen([todo.entry_id]);
            revalidate();
            t.style = Toast.Style.Success;
            t.title = "Reopened";
            t.primaryAction = undefined;
          },
        },
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <MenuBarExtra
      // Green when there's something due today; default (adaptive) otherwise.
      icon={
        todayCount > 0
          ? { source: Icon.CheckCircle, tintColor: Color.Green }
          : Icon.CheckCircle
      }
      title={signedIn && todayCount > 0 ? String(todayCount) : undefined}
      tooltip="Jovida Daily"
      isLoading={isLoading}
    >
      {signedIn && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Ask Jovida Daily…"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
            onAction={() =>
              open("raycast://extensions/raycast/raycast-ai/ai-chat")
            }
          />
          <MenuBarExtra.Item
            title="Add Todo…"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() =>
              launchCommand({
                name: "add-todo",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <MenuBarExtra.Item
            title="Open My Todos…"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() =>
              launchCommand({
                name: "my-todos",
                type: LaunchType.UserInitiated,
              })
            }
          />
        </MenuBarExtra.Section>
      )}

      {!signedIn && (
        <MenuBarExtra.Item
          title="Sign in to Jovida…"
          icon={Icon.Person}
          onAction={() =>
            launchCommand({ name: "my-todos", type: LaunchType.UserInitiated })
          }
        />
      )}

      {signedIn && total === 0 && (
        <MenuBarExtra.Item title="Nothing pending 🎉" />
      )}

      {signedIn &&
        BUCKET_ORDER.map((bucket) => {
          const items = groups.get(bucket);
          if (!items || items.length === 0) return null;
          return (
            <MenuBarExtra.Section
              key={bucket}
              title={`${BUCKET_TITLE[bucket]} · ${items.length}`}
            >
              {items.map((todo) => {
                const due = formatWhen(todo.when);
                const hasRemind = (todo.remind_at?.length ?? 0) > 0;
                const subtitle = [due, hasRemind ? "🔔" : ""]
                  .filter(Boolean)
                  .join("  ");
                return (
                  <MenuBarExtra.Item
                    key={todo.entry_id}
                    title={todo.title}
                    subtitle={subtitle || undefined}
                    icon={Icon.Circle}
                    tooltip="Click to complete · ⌥ to edit"
                    onAction={() => completeItem(todo)}
                    alternate={
                      <MenuBarExtra.Item
                        title={todo.title}
                        subtitle="Edit…"
                        icon={Icon.Pencil}
                        onAction={() =>
                          launchCommand({
                            name: "my-todos",
                            type: LaunchType.UserInitiated,
                            context: { editTodo: todo },
                          })
                        }
                      />
                    }
                  />
                );
              })}
            </MenuBarExtra.Section>
          );
        })}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Jovida"
          icon={Icon.Globe}
          onAction={() => open("https://jovida.ai")}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => revalidate()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
