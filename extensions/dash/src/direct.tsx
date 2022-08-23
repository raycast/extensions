import { MultiDocsetSearch } from "./views";
import { DashArgumentes } from "./types";

export default function Command(props: { arguments: DashArgumentes }) {
  return <MultiDocsetSearch arguments={props.arguments} />;
}
