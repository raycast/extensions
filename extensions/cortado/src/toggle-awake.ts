import { getPreferenceValues, showHUD, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import {
  AwakeMode,
  TOAST_TITLE,
  ensureAwakeAvailable,
  minutesFromNowToAwakeTimestamp,
  nudgeStatus,
  readAwakeSettings,
  statusLabel,
  writeAwakeSettings,
} from "./lib/awake";

export default async function Command() {
  // Earlier versions of this command set their own subtitle to live state
  // via updateCommandMetadata. Raycast persists that metadata until
  // something overwrites it — merely removing the calls left stale
  // "Awake"-style subtitles displayed indefinitely. And `subtitle: null`
  // doesn't revert to the manifest value as hoped: it clears the subtitle
  // entirely (verified live — both action commands went blank). So write
  // the literal static subtitle instead; running it every launch is
  // idempotent and repairs any stale persisted value. Only Awake Status
  // shows live state — a subtitle set here would go stale the instant this
  // command finishes and start contradicting Awake Status's live one.
  await updateCommandMetadata({ subtitle: "Cortado" }).catch(() => {});

  try {
    ensureAwakeAvailable();

    // Always re-read: the tray, another toggle, or Awake's own
    // timed/expirable auto-revert may have changed the file since the last
    // time this command ran.
    const current = readAwakeSettings();
    const isCurrentlyOn = current.properties.mode !== AwakeMode.Off;

    if (isCurrentlyOn) {
      await writeAwakeSettings(current, { mode: AwakeMode.Off });
      await showHUD(statusLabel({ ...current.properties, mode: AwakeMode.Off }));
      await nudgeStatus();
      return;
    }

    const preferences = getPreferenceValues<Preferences>();

    if (preferences.toggleBehavior === "timed") {
      // Mode 3 (Expirable), not mode 2 (Timed): Awake never persists a
      // countdown for mode 2 anywhere, only its own in-memory timer, so
      // there's no field a later read could recover "time left" from. Mode
      // 3's expirationDateTime is an absolute instant, so remaining time is
      // always a pure `expirationDateTime - now` — see statusLabel.
      // intervalHours/intervalMinutes are zeroed deliberately rather than
      // left holding whatever a prior session's values were: they're
      // meaningless for mode 3, but leaving stale numbers behind invites
      // exactly the kind of misread this rewrite exists to fix.
      const patch = {
        mode: AwakeMode.Expirable,
        keepDisplayOn: preferences.keepDisplayOn,
        intervalHours: 0,
        intervalMinutes: 0,
        expirationDateTime: minutesFromNowToAwakeTimestamp(Number(preferences.defaultDuration)),
      };
      await writeAwakeSettings(current, patch);
      await showHUD(statusLabel({ ...current.properties, ...patch }));
      await nudgeStatus();
      return;
    }

    const patch = { mode: AwakeMode.Indefinite, keepDisplayOn: preferences.keepDisplayOn };
    await writeAwakeSettings(current, patch);
    await showHUD(statusLabel({ ...current.properties, ...patch }));
    await nudgeStatus();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: TOAST_TITLE,
      message: (error as Error).message,
    });
  }
}
