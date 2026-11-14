import { LaunchProps, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { addJot, findCli } from "./lib/cli";
import { showGetJotToast } from "./lib/get-jot";
import { parseTags } from "./lib/parse";

export default async function QuickJot(props: LaunchProps<{ arguments: Arguments.QuickJot }>) {
  const text = props.arguments.text.trim();
  if (!text) return;
  if (!findCli()) return showGetJotToast();
  try {
    // "#word" at the end of the text becomes a tag, so "call mom #home" files itself.
    const match = text.match(/^(.*?)((?:\s+#[^\s#]+)+)$/);
    const body = match ? match[1].trim() : text;
    const tags = match ? parseTags(match[2]) : [];
    await addJot({ text: body || text, tags: body ? tags : [] });
    await showHUD(tags.length && body ? `✓ Jotted with ${tags.map((t) => `#${t}`).join(" ")}` : "✓ Jotted", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
  } catch (error) {
    await showFailureToast(error, { title: "Could not add the jot" });
  }
}
