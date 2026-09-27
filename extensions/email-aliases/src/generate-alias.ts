import { Clipboard, LaunchProps, LaunchType, closeMainWindow, launchCommand, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AliasError, buildAlias } from "./lib/alias";
import { AmbiguousTabError, NoTabError, getActiveTab } from "./lib/browsers";
import { extractHost } from "./lib/domain";
import { getSettings } from "./lib/settings";

function openBuilder() {
  launchCommand({ name: "build-alias", type: LaunchType.UserInitiated }).catch((error) => {
    showFailureToast(error, { title: "Could not open Build Email Alias" });
  });
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.GenerateAlias }>) {
  const settings = getSettings();

  if (settings.accounts.length === 0) {
    await showFailureToast(new Error("No valid account found"), {
      title: "Add an email account in the extension preferences",
    });
    return;
  }

  const account = settings.accounts[0];
  const argument = props.arguments.label?.trim() ?? "";

  let host = "";
  let sourceIsLabel = false;
  let source = argument;

  if (argument) {
    // An argument that looks like a URL or a hostname still goes through the
    // domain depth logic, anything else is taken as a hand written label.
    const parsedHost = extractHost(argument);
    if (parsedHost && parsedHost.includes(".")) {
      host = parsedHost;
      source = parsedHost;
    } else {
      sourceIsLabel = true;
    }
  } else {
    try {
      const tab = await getActiveTab({
        browserSource: settings.browserSource,
        preferredBrowser: settings.preferredBrowser,
      });
      const parsedHost = extractHost(tab.url);
      if (!parsedHost) {
        await showFailureToast(new Error(tab.url), { title: "Could not read a domain from the current tab" });
        return;
      }
      host = parsedHost;
      source = parsedHost;
    } catch (error) {
      if (error instanceof AmbiguousTabError || error instanceof NoTabError) {
        await showFailureToast(error, {
          title: error instanceof AmbiguousTabError ? "Several browser windows are open" : "No browser tab found",
          primaryAction: { title: "Open Build Email Alias", onAction: openBuilder },
        });
        return;
      }
      throw error;
    }
  }

  try {
    const { address } = buildAlias({
      account,
      source,
      sourceIsLabel,
      host,
      depth: settings.depth,
      stripWww: settings.stripWww,
      separator: settings.separator,
      suffixMode: settings.suffixMode,
      suffixSeparator: settings.suffixSeparator,
      dateFormat: settings.dateFormat,
      randomLength: settings.randomLength,
      template: settings.template,
      catchAllTemplate: settings.catchAllTemplate,
      lowercase: settings.lowercase,
      dotReplacement: settings.dotReplacement,
      maxAliasLength: settings.maxAliasLength,
    });

    if (settings.action === "copy") {
      await Clipboard.copy(address);
      await showHUD(`Copied ${address}`);
      return;
    }

    await closeMainWindow();
    if (settings.action === "copyPaste") {
      await Clipboard.copy(address);
    }
    await Clipboard.paste(address);
    await showHUD(settings.action === "paste" ? `Pasted ${address}` : `Pasted and copied ${address}`);
  } catch (error) {
    if (error instanceof AliasError) {
      await showFailureToast(error, { title: "Could not build the alias" });
      return;
    }
    throw error;
  }
}
