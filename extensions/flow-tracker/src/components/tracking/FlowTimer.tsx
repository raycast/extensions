import { MenuBarExtra, Icon } from "@raycast/api";
import { useFlow } from "../../contexts/FlowContext";
import { formatTime } from "../../utils/formatters";

export const FlowTimer: React.FC = () => {
  const { isTracking, totalTime, startTracking, stopTracking } = useFlow();

  return (
    <MenuBarExtra
      icon={isTracking ? Icon.CircleFilled : Icon.Circle}
      title={isTracking ? formatTime(totalTime) : undefined}
    >
      <MenuBarExtra.Item
        icon={isTracking ? Icon.Stop : Icon.Play}
        title={isTracking ? "Stop Flow" : "Start Flow"}
        onAction={isTracking ? stopTracking : startTracking}
      />
      <MenuBarExtra.Item title="Start Focus Session" icon={Icon.Play} onAction={startTracking} />
    </MenuBarExtra>
  );
};
