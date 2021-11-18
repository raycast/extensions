import { getStartDirectory, Directory } from "./utils";

export default function Command() {
  return <Directory path={getStartDirectory()} />;
}
