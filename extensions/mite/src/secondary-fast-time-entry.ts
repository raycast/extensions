import { LaunchProps, LaunchType, LocalStorage, Toast, showToast, updateCommandMetadata } from "@raycast/api";
import { parse } from "valibot";
import { fetch_mite } from "./hooks/useMite";
import { time_entry_schema } from "./validations";

export default async function Command({ launchType }: LaunchProps) {
  try {
    const fast_time_entry = JSON.parse((await LocalStorage.getItem("secondary-fast-time-entry")) ?? "");
    const body = parse(time_entry_schema, fast_time_entry);
    if (launchType === LaunchType.Background) {
      if (body.time_entry.subtitle) {
        updateCommandMetadata({
          subtitle: `${body.time_entry.subtitle}`,
        });
      }
      return;
    }
    const res = await fetch_mite("/time_entries.json", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      showToast({ title: "Entry created", style: Toast.Style.Success });
      return;
    }
    showToast({
      title: "Error",
      message: "There was an error in the submission",
      style: Toast.Style.Failure,
    });
  } catch (e) {
    if (launchType === LaunchType.UserInitiated) {
      showToast({
        title: "Error",
        message: "There was an error in the values of the form",
        style: Toast.Style.Failure,
      });
    }
  }
}
