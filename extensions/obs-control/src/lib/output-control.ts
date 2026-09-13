import type OBSWebSocket from "obs-websocket-js";
import type { OBSRequestTypes } from "obs-websocket-js";
import { popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getObs } from "@/lib/obs";
import { appInstalled, appNotInstallAlertDialog, showWebsocketConnectionErrorToast } from "@/lib/utils";

type OutputControlOptions = {
  label: string;
  request: keyof OBSRequestTypes;
  statusRequest: keyof OBSRequestTypes;
  desiredActive: boolean;
  activeMessage: string;
  inactiveMessage: string;
};

type RecordPauseControlOptions = {
  request: "PauseRecord" | "ResumeRecord";
  desiredPaused: boolean;
  message: string;
  alreadyMessage: string;
};

type OutputStatus = {
  outputActive?: boolean;
  outputPaused?: boolean;
};

async function getConnectedObs() {
  if (!(await appInstalled())) {
    await appNotInstallAlertDialog();
    return;
  }

  let obs: OBSWebSocket;
  try {
    obs = await getObs();
  } catch {
    await showWebsocketConnectionErrorToast();
    return;
  }

  return obs;
}

export async function controlOutput(options: OutputControlOptions) {
  const obs = await getConnectedObs();
  if (!obs) {
    return;
  }

  try {
    const status = (await obs.call(options.statusRequest)) as OutputStatus;
    const isActive = Boolean(status.outputActive);

    if (isActive === options.desiredActive) {
      await showHUD(options.desiredActive ? options.activeMessage : options.inactiveMessage);
      return;
    }

    await obs.call(options.request);
    await showHUD(options.desiredActive ? options.activeMessage : options.inactiveMessage);
  } catch {
    await showFailureToast(`${options.label} command failed`, {
      title: "OBS Command Failed",
    });
    return popToRoot();
  }
}

export async function controlRecordPause(options: RecordPauseControlOptions) {
  const obs = await getConnectedObs();
  if (!obs) {
    return;
  }

  try {
    const status = (await obs.call("GetRecordStatus")) as OutputStatus;

    if (!status.outputActive) {
      await showFailureToast("Recording is not active", {
        title: "Recording Error",
      });
      return popToRoot();
    }

    if (Boolean(status.outputPaused) === options.desiredPaused) {
      await showHUD(options.alreadyMessage);
      return;
    }

    await obs.call(options.request);
    await showHUD(options.message);
  } catch {
    await showFailureToast("Recording pause command failed", {
      title: "OBS Command Failed",
    });
    return popToRoot();
  }
}
