import { LaunchProps } from "@raycast/api";
import { createAndCopyAlias } from "./utils/create";
import { openApiKeySetup } from "./utils/invalid-key";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  // Launching from a hotkey skips optional arguments, so `note` can be undefined despite its type
  const note = props.arguments?.note ?? "";

  await createAndCopyAlias(note, async (toast) => {
    await toast.hide();
    await openApiKeySetup();
  });
}
