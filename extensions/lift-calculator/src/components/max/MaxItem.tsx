import { List } from "@raycast/api";
import { MaxResult } from "../../types/max";
import { formatWeight, formatPercentage } from "../../utils/formatting";
import { ItemActions } from "./ItemActions";
import { DetailView } from "./DetailView";

interface MaxItemProps {
  result: MaxResult;
  unitSystem: "kg" | "lbs";
  results: MaxResult[];
  setShowingDetail: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MaxItem: React.FC<MaxItemProps> = ({
  result,
  unitSystem,
  results, // Destructure the new prop
  setShowingDetail,
}) => (
  <List.Item
    actions={
      <ItemActions
        setShowingDetail={setShowingDetail}
        results={results} // Pass results to ItemActions
        unitSystem={unitSystem}
      />
    }
    icon={{ source: result.icon, tintColor: result.tintColor }}
    subtitle={formatWeight(result.value, unitSystem)}
    title={result.label}
    accessories={[
      {
        tag: {
          value: result.percentage ? formatPercentage(result.percentage) : "",
          color: result.tintColor,
        },
        tooltip: result.percentage ? `${formatPercentage(result.percentage)} of your one rep max` : "",
      },
    ]}
    detail={<DetailView result={result} unitSystem={unitSystem} />}
  />
);
