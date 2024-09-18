import { AddToNodeForm } from "./components/AddToNodeForm";
import { useLoadInitialState } from "./state";

export default function Command() {
  useLoadInitialState();
  return <AddToNodeForm />;
}
