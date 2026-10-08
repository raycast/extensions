import _ from "lodash";

import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";

import fakerClient from "@/faker";

type QuicklinkContext = { id?: string; section?: string; mode?: "copy" | "paste"; locale?: string };

export default async function openQuicklink(options: { launchContext?: QuicklinkContext }) {
  const { id, section, mode, locale } = options.launchContext ?? {};

  if (!id || !section || !mode || !locale) {
    showToast({
      title: "Missing Quicklink Data",
      message:
        "This command is not meant to be run directly. Create a quicklink from the generate command, and recreate any quicklink saved before this update.",
      style: Toast.Style.Failure,
    });
    return;
  }

  fakerClient.setLocale(locale);
  const value = (_.get(fakerClient.faker, `${section}.${id}`) as unknown as () => string | number)();

  if (mode === "copy") {
    await Clipboard.copy(value);
    showHUD("Copied to Clipboard");
  } else {
    await Clipboard.paste(value.toString());
  }
}
