import { Action, Icon, Keyboard } from "@raycast/api";
import { compactAhv, formatAhv, randomAhv } from "./lib/ahv";
import { HISTORY_KEYS } from "./lib/history";
import { ValueList } from "./lib/value-list";

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
        <Action.CopyToClipboard
          title="Copy Without Dots"
          content={compactAhv(value)}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      )}
    />
  );
}
