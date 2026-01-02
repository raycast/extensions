import { Icon, MenuBarExtra } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { ICONS } from "./constants";
import { processActiveState } from "./services/active-session";
import { triggerIntervalCompleteNotification } from "./utils/notifications";
import { getParsedPreferences } from "./utils/preferences";
import { resetActiveState, resetSessionTimeOnly, resetStatsOnly } from "./utils/storage";
import { formatTime } from "./utils/time";

export default function Command() {
  const { activeIntervalMinutes } = getParsedPreferences();

  const {
    data: state,
    isLoading,
    revalidate,
  } = usePromise(processActiveState, [], {
    onData: async ({ shouldNotify }) => {
      if (shouldNotify) {
        await triggerIntervalCompleteNotification(activeIntervalMinutes);
      }
    },
    onError: (error) => {
      showFailureToast(error, { title: "Failed to check active status" });
    },
  });

  const activeSeconds = state?.accumulatedActiveSeconds ?? 0;
  const sessionCount = state?.sessionCount ?? 0;
  const isIdle = state?.isIdle ?? false;

  return (
    <MenuBarExtra title={isIdle ? ICONS.IDLE_HEART : formatTime(activeSeconds, false)} isLoading={isLoading}>
      <MenuBarExtra.Section title="Current Session">
        <MenuBarExtra.Item title={`Active Time: ${formatTime(activeSeconds)}`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Stats">
        <MenuBarExtra.Item title={`Intervals Completed: ${sessionCount}`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          icon={Icon.Clock}
          title="Reset Session Time"
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={async () => {
            await resetSessionTimeOnly();
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Hashtag}
          title="Reset Stats"
          onAction={async () => {
            await resetStatsOnly();
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.Trash}
          title="Reset All"
          onAction={async () => {
            await resetActiveState();
            revalidate();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
