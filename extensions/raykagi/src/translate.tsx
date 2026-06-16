import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  LaunchProps,
  List,
  useNavigation,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { translateQuicklink, translateUrl } from "./kagi";

interface Prefs {
  translateFrom: string;
  translateTo: string;
  translateQuality: string;
  translateStyle: string;
  translateFormality: string;
}

interface Pair {
  from: string;
  to: string;
  quality: string;
  style: string;
  formality: string;
}

// Common languages for the add-pair form. Kagi accepts more; preferences can seed any code.
const LANGS: [string, string][] = [
  ["en", "English"],
  ["ru", "Russian"],
  ["es", "Spanish"],
  ["de", "German"],
  ["fr", "French"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["uk", "Ukrainian"],
  ["tr", "Turkish"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
  ["ar", "Arabic"],
  ["hi", "Hindi"],
  ["cs", "Czech"],
  ["sv", "Swedish"],
  ["fi", "Finnish"],
  ["el", "Greek"],
  ["he", "Hebrew"],
  ["id", "Indonesian"],
  ["vi", "Vietnamese"],
  ["th", "Thai"],
];

function langName(code?: string): string {
  if (!code || code === "auto") return "Auto-detect";
  return LANGS.find((l) => l[0] === code)?.[1] ?? code;
}

function prefsToOpts(p: Prefs): Pair {
  return {
    from: p.translateFrom || "auto",
    to: p.translateTo || "en",
    quality: p.translateQuality || "standard",
    style: p.translateStyle || "natural",
    formality: p.translateFormality || "default",
  };
}

function pairLabel(p: Pair): string {
  const q = p.quality && p.quality !== "standard" ? ` · ${p.quality}` : "";
  return `${langName(p.from)} → ${langName(p.to)}${q}`;
}

export default function Command(props: LaunchProps<{ arguments: { text?: string } }>) {
  const defaults = prefsToOpts(getPreferenceValues<Prefs>());
  const [text, setText] = useState(props.arguments?.text || props.fallbackText || "");
  const { value: pairs = [], setValue: setPairs, isLoading } = useLocalStorage<Pair[]>("translate-pairs", []);
  const t = text.trim();
  const defaultTo = langName(defaults.to);

  async function addPair(p: Pair) {
    if (!pairs.some((x) => pairLabel(x) === pairLabel(p))) await setPairs([...pairs, p]);
  }

  const addAction = (
    <Action.Push
      title="Add Language Pair…"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<PairForm defaults={defaults} onSave={addPair} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder={`Text to translate → ${defaultTo}…`}
    >
      <List.Section title="Translate">
        <List.Item
          icon={Icon.Globe}
          title={t || "Type text to translate…"}
          subtitle={`${langName(defaults.from)} → ${defaultTo}`}
          actions={
            <ActionPanel>
              {t && (
                <Action.OpenInBrowser
                  title={`Translate → ${defaultTo}`}
                  icon={Icon.Globe}
                  url={translateUrl(t, defaults)}
                />
              )}
              {addAction}
              {t && (
                <Action.CopyToClipboard
                  title="Copy Translation URL"
                  icon={Icon.Clipboard}
                  content={translateUrl(t, defaults)}
                />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      {pairs.length > 0 && (
        <List.Section title="Saved pairs">
          {pairs.map((p, i) => (
            <List.Item
              key={`${pairLabel(p)}-${i}`}
              icon={Icon.Globe}
              title={pairLabel(p)}
              subtitle={t ? `translate “${t}”` : undefined}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title={t ? `Translate → ${langName(p.to)}` : "Open Kagi Translate"}
                    icon={Icon.Globe}
                    url={translateUrl(t, p)}
                  />
                  <Action.CreateQuicklink
                    title="Bind as Quicklink (Alias / Hotkey)"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    quicklink={{ name: `Kagi Translate ${pairLabel(p)}`, link: translateQuicklink(p) }}
                  />
                  {addAction}
                  <Action
                    title="Remove Pair"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => setPairs(pairs.filter((_, idx) => idx !== i))}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

// Add-pair form: pick the pair/settings, save it as an in-extension preset (shows up as a
// one-press action above). Optionally turn a saved pair into a Quicklink for a global hotkey.
function PairForm({ defaults, onSave }: { defaults: Pair; onSave: (p: Pair) => void }) {
  const { pop } = useNavigation();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [quality, setQuality] = useState(defaults.quality);
  const [style, setStyle] = useState(defaults.style);
  const [formality, setFormality] = useState(defaults.formality);
  const pair: Pair = { from, to, quality, style, formality };

  return (
    <Form
      navigationTitle="Add Language Pair"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Pair"
            icon={Icon.Plus}
            onSubmit={() => {
              onSave(pair);
              pop();
            }}
          />
          <Action.OpenInBrowser
            title="Preview Translation"
            icon={Icon.Globe}
            url={translateUrl("hello", pair)}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Save this language pair so it appears as a one-press action in Translate. Tip: ⌘B on a saved pair also creates a Quicklink (for a global alias/hotkey)." />
      <Form.Dropdown id="from" title="From" value={from} onChange={setFrom}>
        <Form.Dropdown.Item value="auto" title="Auto-detect" />
        {LANGS.map(([c, n]) => (
          <Form.Dropdown.Item key={c} value={c} title={`${n} (${c})`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="to" title="To" value={to} onChange={setTo}>
        {LANGS.map(([c, n]) => (
          <Form.Dropdown.Item key={c} value={c} title={`${n} (${c})`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="quality" title="Quality" value={quality} onChange={setQuality}>
        <Form.Dropdown.Item value="standard" title="Standard" />
        <Form.Dropdown.Item value="best" title="Best" />
      </Form.Dropdown>
      <Form.Dropdown id="style" title="Style" value={style} onChange={setStyle}>
        <Form.Dropdown.Item value="natural" title="Natural" />
        <Form.Dropdown.Item value="literal" title="Literal" />
      </Form.Dropdown>
      <Form.Dropdown id="formality" title="Formality" value={formality} onChange={setFormality}>
        <Form.Dropdown.Item value="default" title="Default" />
        <Form.Dropdown.Item value="more" title="More formal" />
        <Form.Dropdown.Item value="less" title="Less formal" />
      </Form.Dropdown>
    </Form>
  );
}
