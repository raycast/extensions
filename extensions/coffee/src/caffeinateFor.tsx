import { popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useRef } from "react";
import { startCaffeinate, deviceName } from "./utils";

async function caffeinateFor({ hours, minutes, seconds }: Arguments.CaffeinateFor) {
  const hasValue = hours || minutes || seconds;

  if (!hasValue) {
    await showToast(Toast.Style.Failure, "No values set for caffeinate length");
    return;
  }

  const validInput =
    (!hours || (Number.isInteger(Number(hours)) && Number(hours) >= 0)) &&
    (!minutes || (Number.isInteger(Number(minutes)) && Number(minutes) >= 0)) &&
    (!seconds || (Number.isInteger(Number(seconds)) && Number(seconds) >= 0));

  if (!validInput) {
    await showToast(Toast.Style.Failure, "Please ensure all arguments are whole numbers");
    return;
  }

  const totalSeconds = Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    await showToast(Toast.Style.Failure, "Please enter a duration greater than zero");
    return;
  }

  const formattedTime = `${hours ? `${hours}h` : ""}${minutes ? `${minutes}m` : ""}${seconds ? `${seconds}s` : ""}`;

  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your ${deviceName()} for ${formattedTime}`,
    `-t ${totalSeconds}`,
    { kind: "for", endsAt: new Date(Date.now() + totalSeconds * 1000).toISOString() },
  );
}

export default function Command(props: { arguments: Arguments.CaffeinateFor }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    caffeinateFor(props.arguments)
      .catch((error: unknown) =>
        showToast(Toast.Style.Failure, "Failed to caffeinate", error instanceof Error ? error.message : String(error)),
      )
      .finally(() => popToRoot());
  }, [props.arguments]);

  return null;
}
