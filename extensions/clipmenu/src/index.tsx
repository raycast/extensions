import { Clipboard, Icon, MenuBarExtra, updateCommandMetadata } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { iiafe } from "./utils";

export default function Command() {
  const [history, setHistory] = useCachedState<string[]>("latest-clipboard-histories", [""]);

  iiafe(async () => {
    const _history = (
      await Promise.all(
        Array(6)
          .fill(0)
          .map((_, idx) => Clipboard.readText({ offset: idx })),
      )
    ).filter(Boolean) as string[];

    updateCommandMetadata({ subtitle: _history[0] });
    setHistory(_history);
  });

  return (
    <MenuBarExtra icon={Icon.Clipboard} title={history[0]}>
      <MenuBarExtra.Item title="Clipboard History" />
      {history.map((text, i) => (
        <MenuBarExtra.Item key={text + i} title={text} onAction={() => Clipboard.paste(text)} icon={Icon.Clipboard} />
      ))}
    </MenuBarExtra>
  );
}
