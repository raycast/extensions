import { Clipboard, Icon, MenuBarExtra, getPreferenceValues, open, updateCommandMetadata } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { truncateText } from "./utils";
export default function Command() {
  const userConfig = getPreferenceValues<Preferences.Index>();

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
    <MenuBarExtra
      isLoading={isLoading}
      icon={Icon.Clipboard}
      title={
        userConfig.preview && data && data.length > 0
          ? truncateText(data[0], Number(userConfig.truncate)).replace(/[\n\r]/g, "\\n")
          : ""
      }
    >
      <MenuBarExtra.Section title="Clipboard History">
        {data &&
          data.map((text, i) => (
            <MenuBarExtra.Item
              key={text + i}
              title={truncateText(text, Number(userConfig.truncate)).replace(/[\n\r]/g, "\\n")}
              onAction={() => Clipboard.paste(text)}
              icon={Icon.Clipboard}
            />
          ))}
        <MenuBarExtra.Item
          key="show-all-history"
          title="Show All History"
          onAction={() => open("raycast://extensions/raycast/clipboard-history/clipboard-history")}
          icon={Icon.ArrowRightCircle}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
