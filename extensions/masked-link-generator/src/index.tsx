import { ActionPanel, Action, List, LaunchProps, Clipboard, showHUD, Toast, showToast } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";

export default async function Command(props: LaunchProps) {
  const { name, url } = props.arguments;
  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }
  if (!isValidUrl(url)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL",
    });
    return;
  } else {
    Clipboard.copy(`[${name}](<${url}>)`);
    showToast({
      style: Toast.Style.Success,
      title: "Masked URL Copied to Clipboard!",
    });
  }
}
