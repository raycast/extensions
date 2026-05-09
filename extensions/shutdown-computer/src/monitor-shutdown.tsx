import {
  Icon,
  LocalStorage,
  MenuBarExtra,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  abortExistingShutdown,
  formatDuration,
  SHUTDOWN_TARGET_TIME_KEY,
} from "./shutdown-utils";

export default function Command() {
  const [targetTime, setTargetTime] = useState<number>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    LocalStorage.getItem<number>(SHUTDOWN_TARGET_TIME_KEY).then(setTargetTime);

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!targetTime || targetTime <= now) {
    return null;
  }

  const remainingSeconds = Math.ceil((targetTime - now) / 1000);
  const remainingTime = formatDuration(remainingSeconds);

  async function cancelShutdown() {
    const didCancel = await abortExistingShutdown();
    await LocalStorage.removeItem(SHUTDOWN_TARGET_TIME_KEY);
    setTargetTime(undefined);

    await showToast({
      style: didCancel ? Toast.Style.Success : Toast.Style.Failure,
      title: didCancel ? "Shutdown canceled" : "No pending shutdown found",
    });
  }

  return (
    <MenuBarExtra
      icon={Icon.Clock}
      title={remainingTime}
      tooltip={`Computer will shut down in ${remainingTime}`}
    >
      <MenuBarExtra.Item
        title={`Shutting down in ${remainingTime}`}
        icon={Icon.Clock}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Cancel Shutdown"
        icon={Icon.XMarkCircle}
        onAction={cancelShutdown}
      />
    </MenuBarExtra>
  );
}
