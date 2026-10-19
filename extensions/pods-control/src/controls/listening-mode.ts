import { getPreferenceValues, openCommandPreferences } from "@raycast/api";
import * as PodsControlCli from "../cli/client";
import { CliError } from "../cli/errors";
import { type SubtitleRevision } from "../commands/launch-context";
import { LISTENING_MODE_PRESENTATION, listeningModeHud } from "../features/presentation";
import { ToastManager } from "../feedback/toast-manager";
import { publishListeningModeSubtitle } from "../subtitles/feature-subtitles";
import { runWithSubtitleOperation, showCliFailure } from "./control-operation";
import type { ListeningModes } from "../features/types";
interface SetListeningModeCommandOptions {
  updateCycleSubtitle: boolean;
}

async function publishConfirmedListeningMode(
  error: unknown,
  enabled: boolean,
  revision?: SubtitleRevision,
): Promise<void> {
  if (!enabled) return;

  const mode = error instanceof CliError ? PodsControlCli.confirmedListeningMode(error.payload) : null;
  await publishListeningModeSubtitle(mode, revision);
}

export async function runSetListeningModeCommand(
  modeToActivate: ListeningModes,
  { updateCycleSubtitle }: SetListeningModeCommandOptions,
): Promise<void> {
  const { label } = LISTENING_MODE_PRESENTATION[modeToActivate];
  const toast = new ToastManager({
    loading: `Setting to ${label}...`,
    success: listeningModeHud(modeToActivate),
    failure: `Failed to set ${label}`,
  });
  await toast.setToLoading();

  const run = async (revision: SubtitleRevision): Promise<void> => {
    try {
      const confirmedMode = await PodsControlCli.setListeningMode(modeToActivate);
      if (updateCycleSubtitle) {
        await publishListeningModeSubtitle(confirmedMode, revision);
      }
      await toast.setToSuccess({ titleOverride: listeningModeHud(confirmedMode) });
    } catch (error) {
      await publishConfirmedListeningMode(error, updateCycleSubtitle, revision);
      await showCliFailure(toast, error, { offRequested: modeToActivate === "off" });
    }
  };

  await runWithSubtitleOperation("listening-mode", toast, run);
}

function getEnabledListeningModes(): ListeningModes[] {
  const preferences = getPreferenceValues<Preferences.CycleListeningMode>();
  const enabledModes: ListeningModes[] = [];
  if (preferences.cycleOff) enabledModes.push("off");
  if (preferences.cycleTransparency) enabledModes.push("transparency");
  if (preferences.cycleAdaptive) enabledModes.push("adaptive");
  if (preferences.cycleAnc) enabledModes.push("noise-cancellation");
  return enabledModes;
}

export async function runCycleListeningModeCommand(): Promise<void> {
  const toast = new ToastManager({
    loading: "Cycling listening mode...",
    success: "Cycled listening mode",
    failure: "Failed to cycle listening mode",
  });
  await toast.setToLoading();

  const enabledModes = getEnabledListeningModes();
  if (enabledModes.length < 2) {
    await toast.setToFailure({
      error: new Error("Enable at least two listening modes in Cycle Listening Mode preferences."),
      action: {
        title: "Open Command Preferences",
        onAction: openCommandPreferences,
      },
    });
    return;
  }

  const run = async (revision: SubtitleRevision): Promise<void> => {
    try {
      const confirmedMode = await PodsControlCli.cycleListeningMode(enabledModes);
      await publishListeningModeSubtitle(confirmedMode, revision);
      await toast.setToSuccess({
        titleOverride: listeningModeHud(confirmedMode),
      });
    } catch (error) {
      await publishConfirmedListeningMode(error, true, revision);
      if (error instanceof CliError && error.code === "unsupported") {
        await toast.setToFailure({
          error: new Error(
            "The connected device supports fewer than two of the enabled listening modes. Adjust the command preferences.",
          ),
          action: {
            title: "Open Command Preferences",
            onAction: openCommandPreferences,
          },
        });
        return;
      }
      await showCliFailure(toast, error, { offRequested: false });
    }
  };

  await runWithSubtitleOperation("listening-mode", toast, run);
}
