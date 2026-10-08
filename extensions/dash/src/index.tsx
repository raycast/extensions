import { MultiDocsetSearch } from "./views";
import { DashArguments } from "./types";

export default function Command(props: { arguments?: DashArguments }) {
  return <MultiDocsetSearch arguments={props.arguments} />;
}
