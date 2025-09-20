import { SupertagsList } from "./components/SupertagsList";
import { useLoadInitialState } from "./state";

export default function Command() {
  useLoadInitialState();
  return <SupertagsList />;
}
