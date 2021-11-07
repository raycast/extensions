import { homedir } from "os";
import { Directory } from "./utils";

export default function Command() {
  return <Directory path={homedir()} />;
}
