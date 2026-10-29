import { Icon, Keyboard } from "@raycast/api";
import { compactAhv, formatAhv, randomAhv } from "./lib/ahv";
import { HISTORY_KEYS } from "./lib/history";
import { CopyAction, PasteAction, ValueList } from "./lib/value-list";

const PASTE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "v" },
  Windows: { modifiers: ["ctrl", "shift"], key: "v" },
};

function generate() {
  return formatAhv(randomAhv());
}

export default function Command() {
  return (
    <ValueList
      generate={generate}
      historyKey={HISTORY_KEYS.ssn}
      noun="SSN"
      icon={Icon.Person}
      extraActions={(value) => (
        <>
          <CopyAction title="Copy Without Dots" content={compactAhv(value)} shortcut={Keyboard.Shortcut.Common.Copy} />
          <PasteAction title="Paste Without Dots" content={compactAhv(value)} shortcut={PASTE_SHORTCUT} />
        </>
      )}
    />
  );
}
