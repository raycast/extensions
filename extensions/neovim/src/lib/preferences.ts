import { getPreferenceValues } from "@raycast/api";
import type { ViewLayout } from "./types";

type ExtensionPreferences = Record<string, unknown>;

const preferences = getPreferenceValues<ExtensionPreferences>();

export const terminalApp = (preferences.terminalApp as string) || "auto";
export const nvimPath = (preferences.nvimPath as string) || "nvim";
export const layout: ViewLayout = (preferences.layout as ViewLayout) || "list";
