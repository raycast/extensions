import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
    /** Shows match context as subtitles when searching. */
    showSearchContext: boolean;

    /** Shows the folder name for each snippet in the accessories area. */
    showFolder: boolean;

    /** Shows tag names for each snippet in the accessories area. */
    showTags: boolean;

    /** Shows languages for each snippet in the accessories area. */
    showLanguages: boolean;

    /** Saves the last used search filter across launches. */
    persistSearchFilter: boolean;

    /** The first snippet action in action panel. */
    primaryAction: string;

    /** The second snippet action in action panel. */
    secondaryAction: string;

    /** Absolute path of the location of the `lab` command-line utility. */
    cliPath?: string;
}

export function getPreferences() {
    return getPreferenceValues<Preferences>();
}
