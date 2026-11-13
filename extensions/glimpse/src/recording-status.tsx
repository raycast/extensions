import { Color, Icon, MenuBarExtra } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { glimpse, RecordStatus } from "./glimpse";
import { formatElapsed, formatMinutes } from "./recording";

export default function Command() {
  // record status never launches Glimpse. Failures just hide the timer.
  const { data, isLoading, revalidate } = useCachedPromise(() => glimpse<RecordStatus>(["record", "status"]), [], {
    onError: () => undefined,
  });

  if (!data?.app_running || data.status === "idle") {
    // Stay alive while the status loads, but show nothing.
    return isLoading ? <MenuBarExtra isLoading /> : null;
  }

  const paused = data.status === "paused";
  const saving = data.status === "saving";

  async function run(args: string[], failure: string) {
    try {
      await glimpse(args);
    } catch (error) {
      await showFailureToast(error, { title: failure });
    }
    revalidate();
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={paused ? Icon.Pause : { source: Icon.CircleFilled, tintColor: saving ? Color.SecondaryText : Color.Red }}
      title={saving ? "Saving…" : formatMinutes(data.elapsed_ms ?? 0)}
      tooltip={saving ? "Saving recording…" : paused ? "Recording paused" : "Recording"}
    >
      {saving ? null : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`${paused ? "Paused" : "Recording"} ${formatElapsed(data.elapsed_ms ?? 0)}`} />
          <MenuBarExtra.Item
            title={paused ? "Resume" : "Pause"}
            icon={paused ? Icon.Play : Icon.Pause}
            onAction={() =>
              run(
                ["record", paused ? "resume" : "pause"],
                paused ? "Couldn't resume recording" : "Couldn't pause recording",
              )
            }
          />
          <MenuBarExtra.Item
            title="Add Bookmark"
            icon={Icon.Bookmark}
            onAction={() => run(["record", "bookmark"], "Couldn't add bookmark")}
          />
          <MenuBarExtra.Item
            title="Finish Recording"
            icon={Icon.Stop}
            onAction={() => run(["record", "finish"], "Couldn't finish recording")}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Record Screen"
          icon={Icon.AppWindow}
          onAction={() => run(["open", "record"], "Couldn't open Glimpse")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
