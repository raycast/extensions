import { getPreferenceValues } from "@raycast/api";
import { Account, SuffixMode, parseAccounts, parseNumber, parseOptionalNumber } from "./alias";
import { DomainDepth } from "./domain";

export type AliasAction = "copy" | "copyPaste" | "paste";

export interface Settings {
  accounts: Account[];
  separator: string;
  depth: DomainDepth;
  stripWww: boolean;
  dotReplacement: string;
  suffixMode: SuffixMode;
  suffixSeparator: string;
  dateFormat: string;
  randomLength: number;
  template: string;
  catchAllTemplate: string;
  lowercase: boolean;
  maxAliasLength?: number;
  action: AliasAction;
  browserSource: string;
  preferredBrowser?: string;
}

/**
 * Reads the manifest-generated preference type, so the shape here can never
 * drift away from `package.json`.
 */
export function getSettings(): Settings {
  const raw = getPreferenceValues<Preferences>();

  return {
    accounts: parseAccounts(raw.accounts),
    separator: raw.separator,
    depth: raw.domainDepth,
    stripWww: raw.stripWww,
    dotReplacement: raw.dotReplacement,
    suffixMode: raw.suffixMode,
    suffixSeparator: raw.suffixSeparator,
    dateFormat: raw.dateFormat,
    randomLength: parseNumber(raw.randomLength, 4),
    template: raw.template.trim() || "{user}{sep}{alias}@{domain}",
    catchAllTemplate: raw.catchAllTemplate.trim() || "{alias}@{domain}",
    lowercase: raw.lowercase,
    maxAliasLength: parseOptionalNumber(raw.maxAliasLength),
    action: raw.action,
    browserSource: raw.browserSource,
    preferredBrowser: raw.preferredBrowser?.name,
  };
}
