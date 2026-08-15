// lift-volume.tsx
import { LaunchProps } from "@raycast/api";
import { VolumeCommandArgs } from "./types/volume";
import { ListView } from "./components/volume/ListView";
import { useVolumeCalculator } from "./hooks/useVolumeCalculator";

export default function Command(props: LaunchProps<{ arguments: VolumeCommandArgs }>) {
  const { weight, setWeight, results } = useVolumeCalculator(props.arguments.oneRepMax);

  return <ListView weight={weight} setWeight={setWeight} results={results} />;
}
