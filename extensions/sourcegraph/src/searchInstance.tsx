import { LaunchProps } from "@raycast/api";

import SearchCommand from "./components/SearchCommand";
import InstanceCommand from "./components/InstanceCommand";

export default function SearchInstance(props: LaunchProps) {
  return <InstanceCommand Command={SearchCommand} props={props} />;
}
