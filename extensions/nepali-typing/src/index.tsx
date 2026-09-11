import { Form, ActionPanel, Action, Detail, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { transliterate } from "./lib/transliterate";
import { fetchCandidates, fetchTransliteration } from "./lib/google";
import { fetchTranslation } from "./lib/translate";

const CHEATSHEET: string = `# Nepali Typing — Cheatsheet

Type Nepali by sound. A consonant carries its own \`a\` automatically.

## Vowels

| Type | Get | | Type | Get |
|---|---|---|---|---|
| \`a\` | अ | | \`e\` | ए |
| \`aa\` | आ | | \`ai\` | ऐ |
| \`i\` | इ | | \`o\` | ओ |
| \`ee\` | ई | | \`au\` | औ |
| \`u\` | उ | | | |
| \`oo\` | ऊ | | | |

Long vowels use the double form: \`nepaal\` → नेपाल, \`kitaab\` → किताब.

## Consonants

| Plain | | + h (breathy) | | CAPS (hard) |
|---|---|---|---|---|
| \`ka\` क | | \`kha\` ख | | \`Ta\` ट |
| \`ga\` ग | | \`gha\` घ | | \`Tha\` ठ |
| \`cha\` च | | \`chha\` छ | | \`Da\` ड |
| \`ja\` ज | | \`jha\` झ | | \`Dha\` ढ |
| \`pa\` प | | \`pha\` फ | | \`Na\` ण |
| \`ta\` त | | \`tha\` थ | | |

Lowercase \`ta tha da dha na\` = dental (soft). CAPS = retroflex (hard).

## Symbols

| Type | Get | Example |
|---|---|---|
| \`*\` | ं | \`na*\` → नं |
| \`**\` | ँ | \`na**\` → नँ |
| \`.\` | । | \`ghar.\` → घर। |
| \`\\\\\` | ् (join) | force a conjunct |
| \`/\` | (split) | breaks a conjunct, then vanishes |

## Examples

| Type | Get |
|---|---|
| \`namaste\` | नमस्ते |
| \`ma ghar jaanchhu\` | म घर जान्छु |
| \`teknoloji\` | टेक्नोलोजी |
`;

const DEBOUNCE_MS: number = 350;

export default function Command() {
  const { useOnline } = getPreferenceValues<Preferences.Index>();
  const [input, setInput] = useState<string>("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [source, setSource] = useState<"online" | "offline" | "translated">("offline");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const requestId = useRef<number>(0);

  useEffect(() => {
    const deterministic: string = transliterate(input);
    setCandidates(deterministic.length > 0 ? [deterministic] : []);
    setSelected(deterministic);
    setSource("offline");

    const id: number = requestId.current + 1;
    requestId.current = id;

    if (!useOnline || input.trim().length === 0) {
      setIsLoading(false);
      return;
    }

    const isSingleToken: boolean = !/[,;\n]/.test(input.trim());
    setIsLoading(true);

    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      const request: Promise<string[]> = isSingleToken
        ? fetchCandidates(input)
        : fetchTransliteration(input).then((combined: string): string[] => [combined]);

      request
        .then((online: string[]) => {
          if (requestId.current !== id) {
            return;
          }
          if (online.length === 0) {
            return;
          }
          setCandidates(online);
          setSelected(online[0]);
          setSource("online");
        })
        .catch((error: Error) => {
          if (requestId.current !== id) {
            return;
          }
          showToast({ style: Toast.Style.Failure, title: "Offline — using deterministic", message: error.message });
        })
        .finally(() => {
          if (requestId.current !== id) {
            return;
          }
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [input, useOnline]);

  const handleTranslate = async (): Promise<void> => {
    if (input.trim().length === 0) {
      return;
    }
    const id: number = requestId.current + 1;
    requestId.current = id;
    setIsLoading(true);
    try {
      const translated: string = await fetchTranslation(input);
      if (requestId.current !== id) {
        return;
      }
      setCandidates((prev: string[]): string[] => (prev.includes(translated) ? prev : [translated, ...prev]));
      setSelected(translated);
      setSource("translated");
    } catch (error) {
      if (requestId.current !== id) {
        return;
      }
      showToast({ style: Toast.Style.Failure, title: "Translation failed", message: (error as Error).message });
    } finally {
      if (requestId.current === id) {
        setIsLoading(false);
      }
    }
  };

  const modeLabel: string = isLoading
    ? "Checking online…"
    : source === "translated"
      ? "Translated (meaning)"
      : source === "online"
        ? "Online (More accurate)"
        : "Offline (Less accurate)";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {selected.length > 0 ? (
            <>
              <Action.Paste content={selected} title="Paste Devanagari" />
              <Action.CopyToClipboard
                content={selected}
                title="Copy Devanagari"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </>
          ) : null}
          <Action
            title="Translate Word (Meaning)"
            onAction={handleTranslate}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <Action.Push
            title="Show Cheatsheet"
            target={<Detail markdown={CHEATSHEET} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
          />
          <Action.OpenInBrowser
            title="Send Feedback"
            url="mailto:jinbe@duck.com?subject=Nepali%20Typing%20Feedback"
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Romanized"
        placeholder="namaste"
        value={input}
        onChange={setInput}
        autoFocus
      />
      {candidates.length > 1 ? (
        <Form.Dropdown id="candidate" title="Candidate" value={selected} onChange={setSelected}>
          {candidates.map((candidate: string, index: number) => (
            <Form.Dropdown.Item key={`${index}-${candidate}`} value={candidate} title={candidate} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.Description title="Devanagari" text={selected.length > 0 ? selected : "…"} />
      <Form.Separator />
      <Form.Description title="Mode" text={modeLabel} />
      <Form.Description title="Tip" text="⌘T translates an English word by meaning (technology → प्रविधि)   ·   ⌘K opens the full cheatsheet" />
      <Form.Separator />
      <Form.Description title="Vowels" text="a aa i ee u oo e ai o au → अ आ इ ई उ ऊ ए ऐ ओ औ" />
      <Form.Description title="Retroflex" text="CAPS: Ta Tha Da Dha Na → ट ठ ड ढ ण" />
      <Form.Description title="Add h" text="ka क → kha ख   ·   pa प → pha फ   ·   ja ज → jha झ" />
      <Form.Description title="Symbols" text="na* → नं   ·   na** → नँ   ·   ghar. → घर।" />
    </Form>
  );
}
