import { Icon, MenuBarExtra } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  describeState,
  DimState,
  dimLess,
  dimMore,
  formatLevelBar,
  getDefaultLevel,
  getLevelSegments,
  getPreferences,
  getStep,
  readState,
  resetDim,
  setDimLevel,
  toggleDim,
} from "./state";

export default function Command() {
  const [state, setState] = useState<DimState>();
  const [isLoading, setIsLoading] = useState(true);
  const preferences = getPreferences();

  useEffect(() => {
    readState()
      .then(setState)
      .finally(() => setIsLoading(false));
  }, []);

  const active = state?.enabled ?? false;
  const currentLevel = state?.level ?? getDefaultLevel();
  const step = getStep();
  const lessLevel = Math.max(0, currentLevel - step);
  const moreLevel = Math.min(90, (active ? currentLevel : getDefaultLevel()) + step);
  const title = active && preferences.showPercentage ? `${state?.level}%` : undefined;
  const tooltip = state ? describeState(state) : "Loading Dimmer";

  async function run(action: () => Promise<DimState>) {
    setIsLoading(true);
    try {
      setState(await action());
    } catch (error) {
      await showFailureToast(error, { title: "Could not update Dimmer" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <MenuBarExtra icon={active ? Icon.Moon : Icon.CircleDisabled} title={title} tooltip={tooltip} isLoading={isLoading}>
      <MenuBarExtra.Item
        icon={active ? Icon.Power : Icon.Moon}
        title={active ? "Turn Off" : "Turn On"}
        onAction={() => run(toggleDim)}
      />
      <MenuBarExtra.Item
        icon={Icon.Gauge}
        title={formatLevelBar(active ? currentLevel : 0)}
        subtitle={active ? `${getLevelSegments(currentLevel)}/10` : "Off"}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        icon={Icon.Minus}
        title="Dim Less"
        subtitle={!active || lessLevel === 0 ? "Off" : `${lessLevel}%`}
        onAction={active ? () => run(dimLess) : undefined}
      />
      <MenuBarExtra.Item
        icon={Icon.Plus}
        title="Dim More"
        subtitle={`${moreLevel}%`}
        onAction={active && currentLevel >= 90 ? undefined : () => run(dimMore)}
      />
      <MenuBarExtra.Separator />
      {[20, 40, 60, 80].map((level) => (
        <MenuBarExtra.Item
          key={level}
          icon={active && state?.level === level ? Icon.Checkmark : undefined}
          title={`Dim ${level}%`}
          onAction={() => run(() => setDimLevel(level))}
        />
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item icon={Icon.RotateAntiClockwise} title="Reset" onAction={() => run(resetDim)} />
    </MenuBarExtra>
  );
}
