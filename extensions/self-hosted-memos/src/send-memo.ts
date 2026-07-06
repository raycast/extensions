import { LaunchProps, showHUD } from "@raycast/api";
import { createMemo } from "./api";

interface SendMemoArguments {
  content: string;
}

export default async function Command(props: LaunchProps<{ arguments: SendMemoArguments }>) {
  const { content } = props.arguments;
  try {
    await createMemo(content, "PRIVATE");
    await showHUD("✓ Memo saved");
  } catch (error) {
    await showHUD(`✗ ${error instanceof Error ? error.message : "Failed to save memo"}`);
  }
}
