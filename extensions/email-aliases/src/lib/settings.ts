import { getPreferenceValues } from "@raycast/api";
import { Account, SuffixMode, parseAccounts, parseNumber, parseOptionalNumber } from "./alias";
import { DomainDepth, isDomainDepth } from "./domain";

interface RawPreferences {
  accounts: string;
  separator?: string;
  domainDepth?: string;
  stripWww?: boolean;
  dotReplacement?: string;
  suffixMode?: string;
  suffixSeparator?: string;
  dateFormat?: string;
  randomLength?: string;
  template?: string;
  catchAllTemplate?: string;
  lowercase?: boolean;
  maxAliasLength?: string;
  action?: string;
  browserSource?: string;
  preferredBrowser?: { name: string; path: string; bundleId?: string };
}

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

function toSuffixMode(value: string | undefined): SuffixMode {
  return value === "date" || value === "random" || value === "both" ? value : "none";
}

function toAction(value: string | undefined): AliasAction {
  return value === "copy" || value === "paste" ? value : "copyPaste";
}

export function getSettings(): Settings {
  const raw = getPreferenceValues<RawPreferences>();

  return {
    accounts: parseAccounts(raw.accounts),
    separator: raw.separator ?? "+",
    depth: raw.domainDepth && isDomainDepth(raw.domainDepth) ? raw.domainDepth : "auto",
    stripWww: raw.stripWww ?? true,
    dotReplacement: raw.dotReplacement ?? "",
    suffixMode: toSuffixMode(raw.suffixMode),
    suffixSeparator: raw.suffixSeparator ?? "-",
    dateFormat: raw.dateFormat ?? "yyMM",
    randomLength: parseNumber(raw.randomLength, 4),
    template: raw.template?.trim() || "{user}{sep}{alias}@{domain}",
    catchAllTemplate: raw.catchAllTemplate?.trim() || "{alias}@{domain}",
    lowercase: raw.lowercase ?? true,
    maxAliasLength: parseOptionalNumber(raw.maxAliasLength),
    action: toAction(raw.action),
    browserSource: raw.browserSource ?? "auto",
    preferredBrowser: raw.preferredBrowser?.name,
  };
}
