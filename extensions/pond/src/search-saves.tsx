import type { LaunchProps } from "@raycast/api";
import { SavesList } from "./components/saves-list";

export default function Command(props: LaunchProps) {
  return <SavesList searchText={props.fallbackText} />;
}
