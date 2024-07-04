import { LaunchProps, showToast, Clipboard } from "@raycast/api";

import { fromBech32, toBech32 } from "@cosmjs/encoding";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Convert }>) {
  let converted;

  try {
    converted = toBech32(props.arguments.prefix, fromBech32(props.arguments.address).data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      await showToast({ title: "Error converting address", message: error.message });
      return;
    }

    await showToast({ title: "Error converting address", message: String(error) });
    return;
  }

  await Clipboard.copy(converted);
  await showToast({ title: "Converted address copied to clipboard", message: converted });
}
