import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, LaunchProps, showToast, Toast } from "@raycast/api";
import { TokenItem } from "./utils/list-from-object";
import { renderTokenSvgToString } from "./components/token-svg";
import { DecodedJwtGate } from "./components/decoded-jwt-gate";
import { ErrorDetail } from "./components/error-detail";
import { usePreferences } from "raycast-hooks";
import useDecodedJwt, { DecodedJwtState, useDecodedJwtValue } from "./utils/use-decoded-jwt";
import { useEffect, useState } from "react";
import { forgetQuicklinkToken, readQuicklinkToken } from "./utils/jwt-quicklinks";

interface JwtItemDetailProps {
  item: TokenItem;
}

function JwtMetadata({ item }: JwtItemDetailProps) {
  if (!item.row) {
    return null;
  }
  return <Detail.Metadata.Label title={item.key} text={item.row[1]} />;
}

function JwtView({ decoded, onForget }: { decoded: DecodedJwtState; onForget?: () => Promise<void> }) {
  const [{ showMetadata }, { update }] = usePreferences({ showMetadata: false });

  return (
    <DecodedJwtGate decoded={decoded}>
      {({ ready, clipboard, header, data, headerItems: headItems, dataItems }) => {
        let tokenImg: string;
        try {
          tokenImg = `<img alt="view token" width="720" src="data:image/svg+xml,${encodeURIComponent(
            renderTokenSvgToString({ clipboard, showToken: !showMetadata, showDetail: true }),
          )}"/>`;
        } catch (e) {
          return <ErrorDetail error={e} value={clipboard} />;
        }

        const metadata = showMetadata && (
          <Detail.Metadata>
            {headItems.map((item) => (
              <JwtMetadata key={item.key} item={item} />
            ))}
            {dataItems.map((item) => (
              <JwtMetadata key={item.key} item={item} />
            ))}
          </Detail.Metadata>
        );

        return (
          <Detail
            isLoading={!ready}
            markdown={tokenImg}
            metadata={metadata}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title={`Copy PAYLOAD JSON`}
                    content={JSON.stringify(data, null, 2)}
                    concealed={Boolean(onForget)}
                  />
                  <Action.CopyToClipboard
                    title={`Copy HEADER JSON`}
                    content={JSON.stringify(header, null, 2)}
                    concealed={Boolean(onForget)}
                  />
                  <Action
                    icon={showMetadata ? Icon.List : Icon.Sidebar}
                    title={`${showMetadata ? "Hide" : "Show"} Key`}
                    onAction={() => update("showMetadata", !showMetadata)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title={"PAYLOAD:DATA"}>
                  {dataItems.map((item) => (
                    <Action.CopyToClipboard
                      key={item.key}
                      title={`Copy ${item.key}${item.row ? ` (${item.row[1]})` : ""} Value`}
                      content={item.value}
                      concealed={Boolean(onForget)}
                    />
                  ))}
                </ActionPanel.Section>
                <ActionPanel.Section title={"HEADER:DATA"}>
                  {headItems.map((item) => (
                    <Action.CopyToClipboard
                      key={item.key}
                      title={`Copy ${item.key} Value`}
                      content={item.value}
                      concealed={Boolean(onForget)}
                    />
                  ))}
                </ActionPanel.Section>
                {onForget && (
                  <ActionPanel.Section>
                    <Action
                      title="Forget Saved Test Token"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={onForget}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        );
      }}
    </DecodedJwtGate>
  );
}

function ClipboardJwtView() {
  return <JwtView decoded={useDecodedJwt()} />;
}

function SavedJwtView({ savedJwtId }: { savedJwtId: string }) {
  const [saved, setSaved] = useState<{ token?: string; readFailed?: boolean }>();
  const decoded = useDecodedJwtValue(saved !== undefined, saved?.token);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const token = await readQuicklinkToken(savedJwtId);
        if (active) setSaved({ token });
      } catch {
        if (active) setSaved({ readFailed: true });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [savedJwtId]);

  async function forget() {
    if (
      !(await confirmAlert({
        title: "Forget Saved Test Token?",
        message: "The quicklink will no longer be able to open this token.",
        primaryAction: { title: "Forget", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;

    try {
      await forgetQuicklinkToken(savedJwtId);
      setSaved({});
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Forget the Test Token" });
    }
  }

  if (!saved) return <Detail isLoading />;
  if (saved.readFailed)
    return <Detail markdown="Could not read the saved test token. Reopen the quicklink to retry." />;
  if (!saved.token)
    return (
      <Detail markdown="This test token is unavailable on this device. Create a new JWT quicklink to save it here." />
    );

  return <JwtView decoded={decoded} onForget={forget} />;
}

export default function Command({ launchContext }: LaunchProps<{ launchContext: { savedJwtId?: string } }>) {
  const savedJwtId = launchContext?.savedJwtId;
  if (savedJwtId === undefined) return <ClipboardJwtView />;
  if (typeof savedJwtId !== "string") return <Detail markdown="This JWT quicklink is invalid." />;

  return <SavedJwtView key={savedJwtId} savedJwtId={savedJwtId} />;
}
