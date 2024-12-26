import { Icon, MenuBarExtra } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { copyAsMarkdownSyntax, readGyazoLinksFromClipboardHistory } from "./utils/Clipboard";
import UploadGyazoFromClioboard from "./upload-gyazo-from-clipboard";
import { setupGyazo } from "./utils/Gyazo";

export default function Command() {
  const { isLoading, data } = usePromise(async () => {
    await setupGyazo();
    return await readGyazoLinksFromClipboardHistory();
  });

  return (
    <MenuBarExtra
      icon="https://assets2.gyazo.com/assets/images/common/logo_circle@2x-619a691648.png"
      tooltip="Gyazo Raycast Plugin"
    >
      <MenuBarExtra.Item
        icon="upload-icon.png"
        title="Upload Image from Clipboard"
        onAction={UploadGyazoFromClioboard}
      />
      <MenuBarExtra.Section title="Click to Copy as Markdown">
        {isLoading && <MenuBarExtra.Section title="⌛ loading..." />}
        {!isLoading && data && data.length === 0 && (
          <MenuBarExtra.Item icon={Icon.Warning} title="No Gyazo link found in the last 5 clipboard history items" />
        )}
        {!isLoading &&
          data &&
          data.map((item, index) => (
            <MenuBarExtra.Item
              key={index}
              title={item.url}
              onAction={() => copyAsMarkdownSyntax(item)}
              icon={{
                source: item.thumbUrl || "",
                fallback: Icon.Warning,
              }}
            />
          ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
