import { closeMainWindow, PopToRootType, showToast, Toast } from "@raycast/api";
import { startCaffeinate, deviceName } from "./utils";
import { calculateDuration } from "./duration";

async function caffeinateFor({ hours, minutes, seconds }: Arguments.CaffeinateFor) {
  const hasValue = hours || minutes || seconds;

  if (!hasValue) {
    await showToast(Toast.Style.Failure, "No values set for caffeinate length");
    return;
  }

  let totalSeconds: number;
  try {
    totalSeconds = calculateDuration({
      hours: hours ? Number(hours) : undefined,
      minutes: minutes ? Number(minutes) : undefined,
      seconds: seconds ? Number(seconds) : undefined,
    });
  } catch (error) {
    await showToast(Toast.Style.Failure, error instanceof Error ? error.message : String(error));
    return;
  }

  const formattedTime = `${hours ? `${hours}h` : ""}${minutes ? `${minutes}m` : ""}${seconds ? `${seconds}s` : ""}`;

  // A no-view command stays alive until its promise settles, even after the
  // window closes. Reset root search here so the next run has fresh arguments,
  // and keep process inspection/persistence out of the visible window's lifetime.
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your ${deviceName()} for ${formattedTime}`,
    `-t ${totalSeconds}`,
    { kind: "for", endsAt: new Date(Date.now() + totalSeconds * 1000).toISOString() },
  );
}

export default async function Command(props: { arguments: Arguments.CaffeinateFor }) {
  try {
    await caffeinateFor(props.arguments);
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Failed to caffeinate",
      error instanceof Error ? error.message : String(error),
    );
  }
}
