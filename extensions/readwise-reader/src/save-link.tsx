import { LaunchProps } from "@raycast/api";
import { handleSave } from "./utils/handleSave";

interface SaveArguments {
  url: string;
  author?: string;
  tags?: string;
}

export default async function Main(props: LaunchProps<{ arguments: SaveArguments }>) {
  const { url, author, tags } = props.arguments;
  await handleSave(url, author, tags);
}
