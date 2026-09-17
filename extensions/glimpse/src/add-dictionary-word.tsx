import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { glimpse } from "./glimpse";

export default async function Command(props: LaunchProps<{ arguments: { word: string } }>) {
  const words = props.arguments.word.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    await showHUD("Enter a word to add");
    return;
  }
  try {
    // dictionary add launches Glimpse if needed and requires an active license.
    const res = await glimpse<{ words: string[] }>(["dictionary", "add", ...words]);
    await showHUD(`Dictionary now has ${res.words.length} words`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't add to dictionary" });
  }
}
