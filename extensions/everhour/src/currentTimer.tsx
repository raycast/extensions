import {
  environment,
  getPreferenceValues,
  LaunchProps,
  LaunchType,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";
import { CurrentTimerResp, ErrorResponse } from "./types";

export default async function Current(props: LaunchProps<{ arguments: Arguments.CurrentTimer }>) {
  const { quickAction, comment } = props.arguments;
  const isBackground = environment.launchType === LaunchType.Background;
  const action = isBackground ? "" : quickAction;
  const API_KEY = getPreferenceValues<Preferences>().token;
  const headers = {
    "X-Api-Key": API_KEY,
    "Content-Type": "application/json",
  };

  type ActiveTimer = CurrentTimerResp & {
    status: "active";
  };
  type CurrentTimer =
    | ActiveTimer
    | {
        status: "stopped";
      };

  try {
    if (!isBackground) await showToast(Toast.Style.Animated, "Fetching Current Timer");
    const response = await fetch("https://api.everhour.com/timers/current", {
      headers,
    });
    if (!response.ok) {
      const err = (await response.json()) as ErrorResponse;
      throw new Error(err.message);
    }
    const current = (await response.json()) as CurrentTimer;

    const toast = !isBackground && (await showToast(Toast.Style.Success, ""));
    if (current.status === "stopped") {
      await updateCommandMetadata({ subtitle: "Everhour - STOPPED" });
      toast && (toast.title = "No Active Timer");
      if (action === "start") {
        if (toast) {
          toast.style = Toast.Style.Animated;
          toast.title = "Starting Timer";
        }
        const startingResponse = await fetch("https://api.everhour.com/timers", {
          method: "POST",
          headers,
          body: comment ? JSON.stringify({ comment }) : undefined,
        });
        if (!startingResponse.ok) {
          const err = (await response.json()) as ErrorResponse;
          throw new Error(err.message);
        }
        const current = (await startingResponse.json()) as ActiveTimer;
        await updateCommandMetadata({
          subtitle:
            `Everhour - ACTIVE (${current.userDate} | ${current.duration}s)` +
            (current.comment ? ` | ${current.comment}` : ""),
        });
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Started Timer";
        }
      } else if (action === "stop") {
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Timer Already Stopped";
        }
      }
    } else {
      await updateCommandMetadata({
        subtitle:
          `Everhour - ACTIVE (${current.startedAt} | ${current.duration}s)` +
          (current.comment ? ` | ${current.comment}` : ""),
      });
      toast && (toast.title = "One Active Timer");
      if (action === "start") {
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Timer Already Started";
        }
      } else if (action === "stop") {
        const toast = await showToast(Toast.Style.Animated, "Stopping Timer");
        const stoppingResponse = await fetch("https://api.everhour.com/timers/current", {
          method: "DELETE",
          headers,
        });
        if (!stoppingResponse.ok) {
          const err = (await response.json()) as ErrorResponse;
          throw new Error(err.message);
        }
        await updateCommandMetadata({ subtitle: `Everhour - STOPPED` });
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "Stopped Timer";
        }
      }
    }
  } catch (error) {
    if (!isBackground) await showFailureToast(error);
    await updateCommandMetadata({ subtitle: "Everhour - ERROR" });
  }
}
