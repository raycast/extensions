import { Clipboard, Icon, MenuBarExtra, updateCommandMetadata } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { truncateText } from "./utils";

export default function Command() {
  const { isLoading, data } = useCachedPromise(async () => {
    const _history = await Promise.all(
      Array(6)
        .fill(0)
        .map((_, idx) => Clipboard.readText({ offset: idx })),
    );

    updateCommandMetadata({ subtitle: _history[0] });
    return _history.filter(Boolean) as string[];
  });

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.Clipboard} title={data ? truncateText(data[0], 50) : ""}>
      <MenuBarExtra.Section title="Clipboard History">
        {data &&
          data.map((text, i) => (
            <MenuBarExtra.Item
              key={text + i}
              title={truncateText(text, 50)}
              onAction={() => Clipboard.paste(text)}
              icon={Icon.Clipboard}
            />
          ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
