import { useState } from "react";
import { List, Action, ActionPanel, Icon, Keyboard, Toast, showToast, Clipboard } from "@raycast/api";
import { generatePassword, generatePassphrase, estimateBits, parseLengthInput, type PasswordPreset } from "./lib/pure";
import { WORDLIST } from "./lib/wordlist";

const PWD_MIN = 8;
const PWD_MAX = 64;
const PWD_DEFAULT = 16;
const WORD_MIN = 3;
const WORD_MAX = 8;
const WORD_DEFAULT = 6;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const PRESETS: Array<{ id: PasswordPreset; label: string; hint: string }> = [
  { id: "say", label: "Easy to say", hint: "letters only" },
  { id: "read", label: "Easy to read", hint: "letters + digits, no ambiguous chars" },
  { id: "all", label: "All characters", hint: "letters + digits + symbols" },
];

/** 各档字符集大小（与 pure.ts classesFor 对应：say=52；read=62-6=56；all=91） */
const POOL_SIZE: Record<PasswordPreset, number> = { say: 52, read: 56, all: 91 };

function bitLabel(bits: number): string {
  if (bits < 45) return "Weak";
  if (bits < 70) return "Fair";
  return "Strong";
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [preset, setPreset] = useState<PasswordPreset>("all");
  const [seed, setSeed] = useState(0); // ⌘R 重生成触发器

  const parsed = parseLengthInput(query);
  const pwdLen = parsed !== null ? clamp(parsed, PWD_MIN, PWD_MAX) : PWD_DEFAULT;
  const wordCount = parsed !== null ? clamp(parsed, WORD_MIN, WORD_MAX) : WORD_DEFAULT;

  const password = generatePassword({ length: pwdLen, preset });
  const passphrase = generatePassphrase(wordCount, WORDLIST);
  const pwdBits = estimateBits(pwdLen, POOL_SIZE[preset]);
  const ppBits = estimateBits(wordCount, WORDLIST.length);

  const pwdSub = `Password · ${pwdLen} chars · ~${Math.round(pwdBits)} bits ${bitLabel(pwdBits)}${pwdBits < 45 ? " · increase length for stronger output" : ""}`;
  const ppSub = `Passphrase · ${wordCount} words · ${Math.round(ppBits)} bits ${bitLabel(ppBits)}${ppBits < 45 ? " · more words for stronger output" : ""}`;

  return (
    <List
      searchText={query}
      onSearchTextChange={setQuery}
      filtering={false}
      searchBarPlaceholder="Number to adjust length: password 8–64 / words 3–8 (empty = 16 chars / 6 words)"
      isShowingDetail={false}
    >
      {PRESETS.map((p) => (
        <List.Item
          key={p.id}
          id={`preset-${p.id}`}
          icon={p.id === preset ? Icon.CircleFilled : Icon.Circle}
          title={p.label}
          subtitle={`Preset · ${p.hint}${p.id === preset ? " · current" : ""}`}
          actions={
            <ActionPanel>
              <Action
                title="Use This Preset"
                icon={Icon.Check}
                onAction={() => {
                  setPreset(p.id);
                  setSeed((s) => s + 1); // 立即重生成Password行
                }}
              />
            </ActionPanel>
          }
        />
      ))}

      <List.Item
        key={`pwd-${seed}-${pwdLen}-${preset}`}
        id="password"
        icon={Icon.Key}
        title={password}
        subtitle={pwdSub}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy"
              content={password}
              onCopy={async () => {
                await showToast(Toast.Style.Success, "CopiedPassword", `${pwdLen} chars · ${bitLabel(pwdBits)}`);
              }}
            />
            <Action
              title="Paste to Frontmost App"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={async () => {
                await Clipboard.paste(password);
              }}
            />
            <Action
              title="Regenerate"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => setSeed((s) => s + 1)}
            />
          </ActionPanel>
        }
      />

      <List.Item
        key={`pp-${seed}-${wordCount}`}
        id="passphrase"
        icon={Icon.Text}
        title={passphrase}
        subtitle={ppSub}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy"
              content={passphrase}
              onCopy={async () => {
                await showToast(Toast.Style.Success, "Copied Passphrase", `${wordCount} words · ${bitLabel(ppBits)}`);
              }}
            />
            <Action
              title="Paste to Frontmost App"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={async () => {
                await Clipboard.paste(passphrase);
              }}
            />
            <Action
              title="Regenerate"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => setSeed((s) => s + 1)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
