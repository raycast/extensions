import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Detail,
  Icon,
  LaunchProps,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadSettings, Settings } from "./lib/settings";
import SetLocation from "./set-location";
import { getTimeline } from "./lib/prayers";
import { currentSlot, nextSlot, AlertKind } from "./lib/state";
import { AlertContext, describeAlert } from "./lib/alerts";
import { snooze } from "./lib/storage";
import { setPrayed } from "./lib/tracker";
import { formatTime, ltrName } from "./lib/format";

const SNOOZE_MINUTES = [5, 10, 15, 30];

/**
 * The alert popup. Opened by the background engine with a slot id and alert kind;
 * opened by hand it shows the running or next prayer.
 */
export default function Command(props: LaunchProps<{ launchContext?: AlertContext }>) {
  const { data: settings, isLoading, error } = usePromise(loadSettings);
  if (!settings) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={isLoading ? "" : `# Set your location\n\n${error?.message ?? ""}`}
        actions={
          <ActionPanel>
            <Action.Push title="Set Prayer Location" icon={Icon.Pin} target={<SetLocation />} />
          </ActionPanel>
        }
      />
    );
  }
  return <PrayerAlert settings={settings} context={props.launchContext} />;
}

function PrayerAlert({ settings, context }: { settings: Settings; context?: AlertContext }) {
  const now = new Date();
  const slots = getTimeline(now, settings.schedule);
  const slot =
    (context && slots.find((s) => s.id === context.slotId)) ?? currentSlot(slots, now) ?? nextSlot(slots, now);
  if (!slot) return <Detail markdown="# No prayer found" />;

  const kind: AlertKind = context?.kind ?? "start";
  const { title, message } = describeAlert(slot, kind, now);
  const close = () => closeMainWindow({ popToRootType: PopToRootType.Immediate });

  return (
    <Detail
      navigationTitle={slot.name}
      markdown={`# ${title}\n\n${message}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Starts" text={formatTime(slot.start)} />
          {slot.jamaat && <Detail.Metadata.Label title="Jamaat" text={formatTime(slot.jamaat)} />}
          <Detail.Metadata.Label title="Ends" text={formatTime(slot.end)} />
          <Detail.Metadata.TagList title="Alert">
            <Detail.Metadata.TagList.Item
              text={
                kind === "headsUp"
                  ? "Coming up"
                  : kind === "start"
                    ? "Started"
                    : kind === "jamaat"
                      ? "Jamaat"
                      : "Ending soon"
              }
              color={kind === "ending" ? Color.Orange : Color.Green}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Mark as Prayed"
            icon={Icon.CheckCircle}
            onAction={async () => {
              try {
                await setPrayed(slot, settings, true);
                await showHUD(`${ltrName(slot.name)} marked prayed`);
              } catch (error) {
                await showHUD(error instanceof Error ? error.message : "Could not update reminder");
              }
            }}
          />
          {SNOOZE_MINUTES.map((minutes, i) => (
            <Action
              key={minutes}
              title={`Snooze ${minutes} Minutes`}
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: String(i + 1) as "1" | "2" | "3" | "4" }}
              onAction={async () => {
                await snooze(slot.id, kind, minutes);
                await showHUD(`Snoozed ${minutes} minutes`);
              }}
            />
          ))}
          <Action title="Dismiss" icon={Icon.XMarkCircle} onAction={close} />
        </ActionPanel>
      }
    />
  );
}
