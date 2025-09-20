import { TargetNodesList } from "./components/TargetNodesList";
import { useLoadInitialState } from "./state";

export default function Command() {
  useLoadInitialState();
  return <TargetNodesList />;
}
