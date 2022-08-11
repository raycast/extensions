import { Folder } from "./components/folder";
import { newOssClient } from "./utils";

export default function Command() {
  newOssClient();
  return <Folder path="" />;
}
