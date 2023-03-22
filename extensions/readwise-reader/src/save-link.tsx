import { LaunchProps, showHUD } from "@raycast/api";
import { saveURL } from "./api/save";

interface SaveArguments {
  url: string;
}

export default async function Main(props: LaunchProps<{ arguments: SaveArguments }>) {
  const { url } = props.arguments;
  try {
    await saveURL(url);
    await showHUD("✅ Saved to Reader");
  } catch (error) {
    await showHUD(`❌ ${(error as Error).message}`);
    return;
  }
}
