// lift-warmup.tsx
import { LaunchProps } from "@raycast/api";
import { WarmupCommandArgs } from "./types/warmup";
import { ListView } from "./components/warmup/ListView";
import { useWarmupCalculator } from "./hooks/useWarmupCalculator";

export default function Command(props: LaunchProps<{ arguments: WarmupCommandArgs }>) {
  const { weight, setWeight, sets } = useWarmupCalculator(props.arguments.weight);

  return <ListView weight={weight} setWeight={setWeight} sets={sets} />;
}
