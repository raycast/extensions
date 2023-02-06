import { List } from "@raycast/api";
import { Flag } from "../types";
import FlagMetadata from "./FlagMetadata";

function FlagDetail(flag: Flag) {
  return <List.Item.Detail metadata={FlagMetadata(flag)} />;
}

export default FlagDetail;
