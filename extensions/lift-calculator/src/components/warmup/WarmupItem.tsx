import { List, Icon } from "@raycast/api";
import { WarmupSet } from "../../types/warmup";
import { formatWeight } from "../../utils/formatting";
import { WARMUP_SCHEMES } from "../../constants/warmup";
import { DetailView } from "./DetailView";
import { ItemActions } from "./ItemActions";

interface WarmupItemProps {
  set: WarmupSet;
  unitSystem: "kg" | "lbs";
  sets: WarmupSet[];
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export const WarmupItem: React.FC<WarmupItemProps> = ({ set, unitSystem, sets, setShowingDetail }) => {
  // Add safety check for index bounds
  const schemeIndex = Math.max(0, Math.min(set.setNumber - 1, WARMUP_SCHEMES.length - 1));
  const { color } = WARMUP_SCHEMES[schemeIndex];
  const isWorkingSet = set.percentage === 1.0;

  return (
    <List.Item
      actions={<ItemActions setShowingDetail={setShowingDetail} sets={sets} unitSystem={unitSystem} />}
      icon={{
        source: Icon.Weights,
        tintColor: color,
      }}
      title={isWorkingSet ? "Working Set" : `Warmup Set ${set.setNumber}`}
      subtitle={`${formatWeight(set.weight, unitSystem)} × ${set.reps} ${set.reps === 1 ? "rep" : "reps"}`}
      accessories={[
        {
          tag: {
            value: `${(set.percentage * 100).toFixed(0)}%`,
            color: color,
          },
        },
      ]}
      detail={<DetailView set={set} unitSystem={unitSystem} />}
    />
  );
};
