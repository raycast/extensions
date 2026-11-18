import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { UrlEditor } from "./components/url-editor";
import { codeBlock } from "./lib/markdown";
import { decodeClipboardQr } from "./lib/qr";
import { findNestedUrl } from "./lib/url";

export default function Command() {
  const {
    data: codes = [],
    error,
    isLoading,
    revalidate,
  } = usePromise(decodeClipboardQr, [], {
    onError: () => {
      // Missing clipboard images and unreadable codes are explained in the empty view.
    },
  });
  const { push } = useNavigation();

  const reload = (
    <Action
      title="Read Clipboard Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search decoded QR codes">
      <List.EmptyView
        icon={Icon.Image}
        title={isLoading ? "Decoding QR codes…" : "Unable to Decode QR Codes"}
        description={
          error?.message ?? "Reads the first image in the current clipboard. Screenshots and image files are supported."
        }
        actions={<ActionPanel>{reload}</ActionPanel>}
      />
      {codes.map((code, index) => {
        const nested = findNestedUrl(code);
        const isWebUrl = nested && ["https:", "http:"].includes(nested.url.value.protocol);
        return (
          <List.Item
            key={`${index}-${code}`}
            title={`QR Code ${index + 1}`}
            subtitle={nested ? "URL" : "Text"}
            keywords={[code]}
            icon={nested ? Icon.Link : Icon.Text}
            detail={<List.Item.Detail markdown={`## Decoded Result\n\n${codeBlock(code)}`} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Decoded Result" content={code} />
                {nested && (
                  <Action
                    title="Parse and Edit URL"
                    icon={Icon.Link}
                    onAction={() => push(<UrlEditor initialUrl={nested.url} />)}
                  />
                )}
                {isWebUrl && <Action.OpenInBrowser title="Open URL" url={nested.url.value.href} />}
                <Action.Paste title="Paste Decoded Result" content={code} />
                {reload}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
