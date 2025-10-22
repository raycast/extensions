import { environment, LaunchType, MenuBarExtra } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { shootConfetti } from "./common";
import { loadConfettiConfiguration } from "./presets";

export default function Command() {
  const configuration = useMemo(() => loadConfettiConfiguration(), []);
  const [hasFired, setHasFired] = useState(false);
  const { activePreset, preferences } = configuration;

  useEffect(() => {
    if (!hasFired && environment.launchType === LaunchType.UserInitiated) {
      setHasFired(true);
      shootConfetti({
        playSound: preferences.confettiSound,
        emojis: activePreset.emojis,
      });
    }
  }, [activePreset.emojis, hasFired, preferences.confettiSound]);

  const icon = activePreset.icon ?? "🎉";

  return <MenuBarExtra isLoading={false} icon={icon} tooltip="1-Click Confetti" />;
}
