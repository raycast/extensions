import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  getApplications,
  open,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  deltaHoursText,
  deltaText,
  emptyCopy,
  fmtHours,
  fmtNum,
  fmtSigned,
  load,
  relativeTime,
  summaryLine,
  STALE_AFTER_MS,
  type LoadResult,
} from "./snapshot";

// The view. Everything it renders comes from ./snapshot, which is deliberately
// free of Raycast imports so the formatting can be tested without Raycast.

/** Electron derives this from the app id; it is stable across both platforms. */
const VITRA_BUNDLE_ID = "com.vitra.app";
const VITRA_SITE = "https://vitrahealth.app";

/**
 * Launch Vitra, or say where to get it.
 *
 * open() wants a file, folder or URL — an application name is none of those, so
 * the installed app has to be resolved to its own path first. Someone reaching
 * for this action is, by definition, often someone who does not have Vitra
 * installed, and the honest answer to that is a pointer to the site rather than
 * a failure with no next step.
 */
async function openVitra(): Promise<void> {
  const installed = await getApplications();
  const vitra = installed.find(
    (app) => app.bundleId === VITRA_BUNDLE_ID || app.name === "Vitra",
  );
  if (vitra) {
    await open(vitra.path);
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Vitra is not installed",
    message: "It is the desktop app this extension reads from",
    primaryAction: {
      title: "Open vitrahealth.app",
      onAction: () => void open(VITRA_SITE),
    },
  });
}

export default function Today() {
  const [result, setResult] = useState<LoadResult | null>(null);

  const refresh = useCallback(() => setResult(load()), []);
  useEffect(refresh, [refresh]);

  if (!result) return <List isLoading />;

  if (result.kind !== "ok") {
    const { title, description } = emptyCopy(result);
    return (
      <List>
        <List.EmptyView
          icon={Icon.Heartbeat}
          title={title}
          description={description}
          actions={
            <ActionPanel>
              <Action
                title="Open Vitra"
                icon={Icon.AppWindow}
                onAction={() => void openVitra()}
              />
              <Action
                title="Reload"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
              <Action.OpenInBrowser title="About Vitra" url={VITRA_SITE} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const s = result.snapshot;
  const stale = Date.now() - new Date(s.generatedAt).getTime() > STALE_AFTER_MS;
  // Heart rate set by a device or medication is not a read on recovery, so this
  // extension shows those numbers without a verdict attached — no colour, no
  // comparison. Vitra sets the flag; we honour it.
  const paced = s.flags?.pacedHeart === true;

  const actions = (
    <ActionPanel>
      <Action
        title="Open Vitra"
        icon={Icon.AppWindow}
        onAction={() => void openVitra()}
      />
      <Action title="Reload" icon={Icon.ArrowClockwise} onAction={refresh} />
      <Action.CopyToClipboard title="Copy Summary" content={summaryLine(s)} />
    </ActionPanel>
  );

  return (
    <List>
      {stale && (
        <List.Section title="Note">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Orange }}
            title="These numbers may be out of date"
            subtitle={`Vitra last published ${relativeTime(s.generatedAt)} — it may not be running`}
            actions={actions}
          />
        </List.Section>
      )}

      {s.scoresWithheld ? (
        <List.Section title="Scores">
          <List.Item
            icon={Icon.EyeDisabled}
            title="Held back until you check in"
            subtitle="Vitra hides scores until you rate the day yourself, so the rating stays your own"
            actions={actions}
          />
        </List.Section>
      ) : (
        <List.Section title="Scores">
          <List.Item
            icon={Icon.Sun}
            title="Readiness"
            subtitle={deltaText(s.scores.readiness, s.baselines.readiness)}
            accessories={[{ text: fmtNum(s.scores.readiness) }]}
            actions={actions}
          />
          <List.Item
            icon={Icon.Moon}
            title="Sleep"
            accessories={[{ text: fmtNum(s.scores.sleep) }]}
            actions={actions}
          />
          <List.Item
            icon={Icon.Footprints}
            title="Activity"
            accessories={[{ text: fmtNum(s.scores.activity) }]}
            actions={actions}
          />
        </List.Section>
      )}

      <List.Section title="Last night">
        <List.Item
          icon={Icon.Moon}
          title="Time asleep"
          subtitle={deltaHoursText(
            s.measurements.sleepHours,
            s.baselines.sleepHours,
          )}
          accessories={[{ text: fmtHours(s.measurements.sleepHours) }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Heartbeat}
          title="HRV"
          subtitle={
            paced
              ? "Shown without interpretation"
              : deltaText(s.measurements.hrvMs, s.baselines.hrvMs, " ms")
          }
          accessories={[{ text: fmtNum(s.measurements.hrvMs, " ms") }]}
          actions={actions}
        />
        <List.Item
          icon={Icon.Heart}
          title="Resting heart rate"
          subtitle={
            paced
              ? "Shown without interpretation"
              : deltaText(
                  s.measurements.restingHr,
                  s.baselines.restingHr,
                  " bpm",
                )
          }
          accessories={[{ text: fmtNum(s.measurements.restingHr, " bpm") }]}
          actions={actions}
        />
        {s.measurements.tempDeviationC != null && (
          <List.Item
            icon={Icon.Temperature}
            title="Body temperature"
            subtitle="Deviation from your own baseline"
            accessories={[
              { text: `${fmtSigned(s.measurements.tempDeviationC)}°C` },
            ]}
            actions={actions}
          />
        )}
        {s.measurements.spo2 != null && (
          <List.Item
            icon={Icon.Droplets}
            title="Blood oxygen"
            accessories={[{ text: fmtNum(s.measurements.spo2, "%") }]}
            actions={actions}
          />
        )}
      </List.Section>

      <List.Section title="Today">
        <List.Item
          icon={Icon.Footprints}
          title="Steps"
          accessories={[{ text: fmtNum(s.measurements.steps) }]}
          actions={actions}
        />
      </List.Section>

      <List.Section title="Source">
        <List.Item
          icon={Icon.Lock}
          title="Read from your own machine"
          subtitle={`${s.day ?? "No day yet"} · Vitra ${s.appVersion} · published ${relativeTime(s.generatedAt)} · nothing leaves this device`}
          actions={actions}
        />
      </List.Section>
    </List>
  );
}
