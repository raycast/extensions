import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { UrlEditor } from "./components/url-editor";
import { codeBlock } from "./lib/markdown";
import { decodeClipboardQr } from "./lib/qr";
import { findNestedUrl } from "./lib/url";

export default function Command() {
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const { push } = useNavigation();

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(undefined);
    setCodes([]);
    decodeClipboardQr()
      .then((result) => {
        if (active) setCodes(result);
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const reload = (
    <Action
      title="Read Clipboard Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setRevision((value) => value + 1)}
    />
  );

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle="Decode Clipboard QR Codes">
      <List.EmptyView
        icon={Icon.Image}
        title={isLoading ? "Decoding QR codes…" : "Unable to Decode QR Codes"}
        description={
          error ?? "Reads the first image in the current clipboard. Screenshots and image files are supported."
        }
        actions={<ActionPanel>{reload}</ActionPanel>}
      />
      {codes.map((code, index) => {
        const nested = findNestedUrl(code);
        const isWebUrl = /^https?:\/\//i.test(code);
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
                {isWebUrl && <Action.OpenInBrowser title="Open URL" url={code} />}
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
