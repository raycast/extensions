import { List } from "@raycast/api";
import { VolumeResult } from "../../types/volume";
import { formatWeight } from "../../utils/formatting";
import { DetailView } from "./DetailView";
import { ItemActions } from "./ItemActions";

interface VolumeItemProps {
  result: VolumeResult;
  results: VolumeResult[];
  unitSystem: "kg" | "lbs";
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export const VolumeItem: React.FC<VolumeItemProps> = ({ result, results, unitSystem, setShowingDetail }) => (
  <List.Item
    icon={{ source: result.scheme.icon, tintColor: result.scheme.color }}
    title={result.goal.charAt(0).toUpperCase() + result.goal.slice(1)}
    subtitle={`${result.scheme.sets}×${result.scheme.reps} @ ${formatWeight(result.weight, unitSystem)}`}
    accessories={[
      {
        tag: {
          value: `${(result.scheme.percentage * 100).toFixed(0)}%`,
          color: result.scheme.color,
        },
      },
      {
        text: `${result.scheme.restMinutes}min rest`,
      },
      {
        text: formatWeight(result.totalVolume, unitSystem),
        tooltip: "Total volume load",
      },
    ]}
    actions={<ItemActions results={results} unitSystem={unitSystem} setShowingDetail={setShowingDetail} />}
    detail={<DetailView result={result} unitSystem={unitSystem} />}
  />
);
