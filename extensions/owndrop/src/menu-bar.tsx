import { Clipboard, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { type DropItem, getServerUrl, listDrops } from "./api";
import { copyDrop } from "./clipboard";

function labelFor(item: DropItem): string {
  const raw = item.type === "text" ? item.linkPreview?.title || item.text || "Text" : item.name || "File";
  const singleLine = raw.replace(/\s+/g, " ").trim();
  return singleLine.length > 48 ? `${singleLine.slice(0, 48)}…` : singleLine;
}

export default function MenuBarCommand() {
  const { data: items, isLoading } = useCachedPromise(async () => listDrops("", 6), []);

  const handleSelect = async (item: DropItem) => {
    if (item.type === "text" && item.text) {
      await Clipboard.copy(item.text);
      await showHUD("Copied drop to clipboard");
      return;
    }
    await copyDrop(item);
    await showHUD(`Copied ${item.name || "file"}`);
  };

  return (
    <MenuBarExtra icon={Icon.Tray} isLoading={isLoading} tooltip="OwnDrop — Latest Drops">
      <MenuBarExtra.Section title="Recent Drops">
        {(items ?? []).length === 0 ? (
          <MenuBarExtra.Item title="No drops yet" />
        ) : (
          (items ?? []).map((item) => (
            <MenuBarExtra.Item
              key={item.id}
              icon={item.type === "image" ? Icon.Image : item.type === "file" ? Icon.Document : Icon.Text}
              title={labelFor(item)}
              subtitle={item.device}
              onAction={() => handleSelect(item)}
            />
          ))
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open OwnDrop Web" icon={Icon.Globe} onAction={() => open(getServerUrl())} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
