import _ from "lodash";

import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";

import { CUSTOM_SECTION, loadCustomItems, renderTemplate } from "@/customItems";
import fakerClient from "@/faker";

type QuicklinkContext = { id?: string; section?: string; mode?: "copy" | "paste"; locale?: string };

async function resolveValue(section: string, id: string): Promise<string | number | undefined> {
  if (section === CUSTOM_SECTION) {
    const customItem = _.find(await loadCustomItems(), { id });
    if (!customItem) {
      showToast({
        title: "Custom Item Not Found",
        message: "The custom item behind this quicklink was deleted. Create it again from the generate command.",
        style: Toast.Style.Failure,
      });
      return undefined;
    }
    try {
      return renderTemplate(customItem.template);
    } catch (error) {
      showToast({
        title: "Custom Item Failed",
        message: error instanceof Error ? error.message : String(error),
        style: Toast.Style.Failure,
      });
      return undefined;
    }
  }

  return (_.get(fakerClient.faker, `${section}.${id}`) as unknown as () => string | number)();
}

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
  const value = await resolveValue(section, id);
  if (value === undefined) return;

  if (mode === "copy") {
    await Clipboard.copy(value);
    showHUD("Copied to Clipboard");
  } else {
    await Clipboard.paste(value.toString());
  }
}
