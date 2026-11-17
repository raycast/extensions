import { LaunchProps } from "@raycast/api";
import { Search } from "./search";

export default function SearchText(props: LaunchProps<{ arguments: Arguments.SearchText }>) {
  return <Search mode="text" query={props.arguments.query ?? ""} />;
}
