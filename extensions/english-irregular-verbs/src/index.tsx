import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
} from "@raycast/api";
import { execSync } from "child_process";
import { useState } from "react";
import { VERBS, IrregularVerb } from "./verbs";
import {
  LANG_LABELS,
  SUPPORTED,
  TRANSLATIONS,
  TranslationLang,
} from "./translations";

interface Preferences {
  language: "auto" | "none" | TranslationLang;
}

function isSupported(code: string): code is TranslationLang {
  return (SUPPORTED as string[]).includes(code);
}

/**
 * Forms that are the American (US) variant within a UK/US irregular pair.
 * Pairs that are NOT a UK/US split (e.g. "was / were", "borne / born") are left out.
 */
const US_VARIANTS = new Set([
  "burned",
  "dove",
  "dreamed",
  "dwelled",
  "gotten",
  "kneeled",
  "leaned",
  "leaped",
  "learned",
  "lighted",
  "pled",
  "sawed",
  "sewed",
  "smelled",
  "spelled",
  "spilled",
  "spit",
  "spoiled",
]);

/** Prefix a 🇺🇸 flag when the form is the American variant. */
function withFlag(form: string): string {
  return US_VARIANTS.has(form) ? `🇺🇸 ${form}` : form;
}

/** Run a command, returning trimmed stdout or null on failure. */
function tryExec(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 1500 }).trim();
  } catch {
    return null;
  }
}

/** Pull the leading language subtag from a locale string ("fr-FR" / "fr_FR.UTF-8" → "fr"). */
function extractLang(locale: string | null | undefined): string | null {
  if (!locale) {
    return null;
  }
  const token = locale.match(/[a-zA-Z]{2,3}(?:[-_][a-zA-Z]+)?/)?.[0];
  const lang = token?.split(/[-_]/)[0].toLowerCase();
  return lang && /^[a-z]{2,3}$/.test(lang) ? lang : null;
}

/**
 * Best-effort system UI language, one pipeline per OS.
 * Raycast exposes no locale API (https://github.com/raycast/extensions/issues/75) and Node's
 * `Intl` reports "en-US" regardless of the OS language, so we probe the OS directly.
 */
function detectSystemLocale(): string | null {
  if (process.platform === "darwin") {
    // macOS rarely sets LANG; read the UI language preference (absolute path — Raycast's PATH is minimal).
    return (
      tryExec("/usr/bin/defaults read -g AppleLanguages") ??
      tryExec("/usr/bin/defaults read -g AppleLocale")
    );
  }
  if (process.platform === "win32") {
    return tryExec(
      'powershell -NoProfile -Command "[Globalization.CultureInfo]::CurrentUICulture.Name"',
    );
  }
  // Linux & others: standard POSIX locale environment variables.
  return (
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    process.env.LANGUAGE ||
    null
  );
}

function systemLanguageCode(): string {
  return (
    extractLang(detectSystemLocale()) ??
    extractLang(Intl.DateTimeFormat().resolvedOptions().locale) ??
    "en"
  );
}

/** Resolve the translation language from the preference, falling back to the system language. */
function resolveLang(pref: Preferences["language"]): TranslationLang | null {
  if (pref === "none") {
    return null;
  }
  if (pref !== "auto") {
    return pref;
  }
  const code = systemLanguageCode();
  return isSupported(code) ? code : null;
}

export default function Command() {
  const { language } = getPreferenceValues<Preferences>();
  const lang = resolveLang(language);
  const [showingDetail, setShowingDetail] = useState(true);

  return (
    <List
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search any form — base, past simple or past participle…"
    >
      {VERBS.map((verb) => (
        <VerbItem
          key={verb.base}
          verb={verb}
          lang={lang}
          showingDetail={showingDetail}
          setShowingDetail={setShowingDetail}
        />
      ))}
    </List>
  );
}

function VerbItem({
  verb,
  lang,
  showingDetail,
  setShowingDetail,
}: {
  verb: IrregularVerb;
  lang: TranslationLang | null;
  showingDetail: boolean;
  setShowingDetail: (value: boolean) => void;
}) {
  const preterits = splitForms(verb.preterit);
  const participles = splitForms(verb.participle);
  const translation = lang ? TRANSLATIONS[lang]?.[verb.base] : undefined;

  // Every form (and the translation) feeds the fuzzy search.
  const keywords = [
    ...preterits,
    ...participles,
    ...(translation ? translation.split(/[\s,()]+/).filter(Boolean) : []),
  ];

  const allForms = `${verb.base} / ${verb.preterit} / ${verb.participle}`;

  return (
    <List.Item
      title={verb.base}
      keywords={keywords}
      // Accessories are only visible when the detail pane is hidden.
      accessories={
        showingDetail
          ? undefined
          : [
              ...preterits.map((form) => ({
                tag: { value: withFlag(form), color: Color.Blue },
                tooltip: US_VARIANTS.has(form)
                  ? "Past simple (US)"
                  : "Past simple",
              })),
              ...participles.map((form) => ({
                tag: { value: withFlag(form), color: Color.Green },
                tooltip: US_VARIANTS.has(form)
                  ? "Past participle (US)"
                  : "Past participle",
              })),
            ]
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Base form"
                text={verb.base}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Past simple">
                {preterits.map((form) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={form}
                    text={withFlag(form)}
                    color={Color.Blue}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Past participle">
                {participles.map((form) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={form}
                    text={withFlag(form)}
                    color={Color.Green}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              {lang && translation ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title={LANG_LABELS[lang]}
                    text={translation}
                  />
                </>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={showingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={() => setShowingDetail(!showingDetail)}
            />
            <Action.CopyToClipboard
              title="Copy All Forms"
              content={allForms}
              icon={Icon.CopyClipboard}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy a Single Form">
            <Action.CopyToClipboard
              title="Copy Base Form"
              content={verb.base}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action.CopyToClipboard
              title="Copy Past Simple"
              content={verb.preterit}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action.CopyToClipboard
              title="Copy Past Participle"
              content={verb.participle}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            {lang && translation ? (
              <Action.CopyToClipboard
                title="Copy Translation"
                content={translation}
                shortcut={{ modifiers: ["cmd"], key: "4" }}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function splitForms(forms: string): string[] {
  return forms
    .split("/")
    .map((f) => f.trim())
    .filter(Boolean);
}
