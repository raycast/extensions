import { LaunchProps } from "@raycast/api";

import DotComCommand from "./components/DotComCommand";
import SearchCommand from "./components/SearchCommand";

export default function SearchDotCom(props: LaunchProps) {
  return <DotComCommand Command={SearchCommand} props={props} />;
}
