import { useCachedState } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";

const STREAMER_MODE_KEY = "streamer-mode";

export function useStreamerMode() {
  const [isEnabled, setIsEnabled] = useCachedState(STREAMER_MODE_KEY, false);

  const toggle = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    await showToast({
      style: Toast.Style.Success,
      title: newValue ? "Streamer Mode Enabled" : "Streamer Mode Disabled",
      message: newValue ? "Sensitive data is now hidden" : "Sensitive data is now visible",
    });
  };

  return { isEnabled, toggle };
}
