import { Cache, Clipboard, Toast, showHUD, showToast, captureException } from "@raycast/api";

import { alias, domains } from "./api";
import * as context from "./context";

import type { Options } from "./api";
import type { LaunchProps } from "@raycast/api";

const cache = new Cache();

async function getOptions(): Promise<Options> {
  if (!cache.get("options")) {
    const response = await domains.options();

    cache.set("options", JSON.stringify(response));

    return response;
  }

  domains.options().then((options) => {
    cache.set("options", JSON.stringify(options));
  });

  return JSON.parse(cache.get("options") ?? "{}");
}

const GenerateAlias = async ({ launchContext: options }: LaunchProps) => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating Alias...",
  });

  try {
    const defaults = await getOptions();

    const response = await alias.create({
      description: await context.get(),
      domain: defaults.defaultAliasDomain,
      format: defaults.defaultAliasFormat,
      ...options,
    } as alias.CreateOptions);

    if (response.id) {
      toast.style = Toast.Style.Success;
      toast.title = "Alias generated successfully";

      await Clipboard.copy(response.email);
      await showHUD("✅ Alias copied to clipboard");
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to generate Alias";
    }
  } catch (error) {
    captureException(error);

    toast.style = Toast.Style.Failure;
    toast.title = "Invalid Credentials";
    toast.message = "Please check your credentials in the extension preferences.";
  }
};

export default GenerateAlias;
