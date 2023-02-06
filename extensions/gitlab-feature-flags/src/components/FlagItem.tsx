import { List } from "@raycast/api";
import { Flag } from "../types";
import FlagActions from "./FlagActions";
import FlagDetail from "./FlagDetail";

function FlagItem(flag: Flag) {
  return <List.Item key={flag.name} title={flag.name} detail={FlagDetail(flag)} actions={FlagActions(flag)} />;
}

export default FlagItem;
