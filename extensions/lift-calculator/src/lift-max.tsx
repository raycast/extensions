// lift-max.tsx
import { LaunchProps } from "@raycast/api";
import { MaxCommandArgs } from "./types/max";
import { ListView } from "./components/max/ListView";
import { useRepMaxCalculator } from "./hooks/useRepMaxCalculator";

export default function Command(props: LaunchProps<{ arguments: MaxCommandArgs }>) {
  const { reps, weight } = props.arguments;
  const { searchText, setSearchText, results, setWeight, setReps } = useRepMaxCalculator(weight, reps);

  return (
    <ListView
      searchText={searchText}
      setSearchText={setSearchText}
      results={results}
      setWeight={setWeight}
      setReps={setReps}
    />
  );
}
