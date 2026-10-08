import { URLSearchParams } from "node:url";
import { open, showHUD } from "@raycast/api";
import type { ThawUrlAction } from "../data";
import { findThawApplication, THAW_INSTALL_URL } from "./checkInstall";
import { showError } from "./error";

export type ThawUrlQuery = Readonly<Record<string, string | undefined>>;

export const buildThawUrl = (action: ThawUrlAction, query?: ThawUrlQuery): string => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const search = searchParams.toString();
  return search ? `thaw://${action}?${search}` : `thaw://${action}`;
};

export const openThawUrl = async (action: ThawUrlAction, successMessage: string, query?: ThawUrlQuery) => {
  try {
    const thawApplication = await findThawApplication();
    if (!thawApplication) {
      await showHUD(`Thaw is not installed. Get it at: ${THAW_INSTALL_URL}`);
      return false;
    }

    await open(buildThawUrl(action, query));
    await showHUD(successMessage);
    return true;
  } catch (error) {
    await showError(error);
    return false;
  }
};
