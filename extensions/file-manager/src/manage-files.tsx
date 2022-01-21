import { getStartDirectory } from "./utils";
import { Directory } from "./components";

export default function Command() {
  return <Directory path={getStartDirectory()} />;
}
