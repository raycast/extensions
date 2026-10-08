import {
  Color,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { dueLabel, groupActions, isMine } from "./vendor/twelfth-shared/index";
import { AuthError, NotSignedInError, signedInEmail } from "./lib/auth";
import { appUrl } from "./lib/config";
import { workspaceContext } from "./lib/context";
import { type Action, listOpenActions } from "./lib/twelfth";

const SHOWN_PER_SECTION = 8;

export default function MenuBar() {
  // Background refreshes must never open a sign-in page, so this reads only a
  // stored token and offers to connect when there is none.
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const [context, actions, email] = await Promise.all([
        workspaceContext({ interactive: false }),
        listOpenActions({ interactive: false }),
        signedInEmail(),
      ]);
      return { context, actions: actions.filter((action) => isMine(action, email)) };
    },
    [],
    // A background refresh has nowhere to show a toast; the failure is shown as a menu item instead.
    { keepPreviousData: true, onError: () => undefined },
  );

  // A refused credential means the cached actions are no longer this person's
  // to show: drop them rather than keep a stale count in the menu bar.
  const signedOut = error instanceof NotSignedInError;
  const keyRejected = error instanceof AuthError && !signedOut;
  const shown = error instanceof AuthError ? undefined : data;
  const timeZone = shown?.context.timeZone;
  const groups = groupActions(shown?.actions ?? [], timeZone, new Date(), shown?.context.firstDayOfWeek);
  const dueNow = groups.overdue.length + groups.today.length;
  const openToday = () => launchCommand({ name: "today", type: LaunchType.UserInitiated });

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "menu-bar-icon.png", tintColor: groups.overdue.length ? Color.Red : Color.PrimaryText }}
      title={dueNow ? String(dueNow) : undefined}
      tooltip={error instanceof AuthError ? "Twelfth: not connected" : `Twelfth: ${dueNow} to do today`}
    >
      {signedOut ? (
        <MenuBarExtra.Item title="Connect Twelfth…" icon={Icon.Plug} onAction={openToday} />
      ) : keyRejected ? (
        <MenuBarExtra.Item
          title="Check your Twelfth API key"
          subtitle={error.message}
          icon={Icon.Key}
          onAction={openExtensionPreferences}
        />
      ) : error && !shown ? (
        <MenuBarExtra.Item
          title="Couldn't reach Twelfth"
          subtitle={error.message}
          icon={Icon.Warning}
          onAction={revalidate}
        />
      ) : (
        <>
          <Section title="Overdue" actions={groups.overdue} timeZone={timeZone} />
          <Section title="Due Today" actions={groups.today} timeZone={timeZone} />
          {dueNow === 0 && !isLoading ? (
            <MenuBarExtra.Item
              title={groups.week.length ? `Nothing due today · ${groups.week.length} this week` : "Nothing due today"}
              icon={Icon.CheckCircle}
              onAction={openToday}
            />
          ) : null}
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="What Should I Do Today"
          icon={Icon.List}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "t" } }}
          onAction={openToday}
        />
        <MenuBarExtra.Item
          title="Open Twelfth"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(appUrl("/app"))}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function Section({ title, actions, timeZone }: { title: string; actions: Action[]; timeZone?: string | null }) {
  if (!actions.length) return null;
  const shown = actions.slice(0, SHOWN_PER_SECTION);
  const more = actions.length - shown.length;
  return (
    <MenuBarExtra.Section title={`${title} (${actions.length})`}>
      {shown.map((action) => (
        <MenuBarExtra.Item
          key={action.id}
          title={truncate(action.title, 60)}
          subtitle={dueLabel(action, timeZone)}
          tooltip={action.details ?? action.title}
          onAction={() => open(appUrl(`/app/tasks/${encodeURIComponent(action.id)}`))}
        />
      ))}
      {more > 0 ? (
        <MenuBarExtra.Item
          title={`${more} more…`}
          onAction={() => launchCommand({ name: "today", type: LaunchType.UserInitiated })}
        />
      ) : null}
    </MenuBarExtra.Section>
  );
}

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
