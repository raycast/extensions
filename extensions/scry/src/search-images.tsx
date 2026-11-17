import { LaunchProps } from "@raycast/api";
import { Search } from "./search";

export default function SearchImages(props: LaunchProps<{ arguments: Arguments.SearchImages }>) {
  return <Search mode="query" query={props.arguments.query ?? ""} />;
}
