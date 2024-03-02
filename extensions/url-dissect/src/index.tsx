import { ActionPanel, Action, Icon, List, Clipboard, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DisectedURL, dissectURL, isURL } from "./utils";

export default function Command() {
  const [dissectedURL, setDissectedURL] = useState<DisectedURL | null>(null);
  const [error, setError] = useState<boolean>(false);
  useEffect(() => {
    async function getUrl() {
      const { text } = await Clipboard.read();
      if (!isURL(text)) {
        setError(true);

        showToast({
          style: Toast.Style.Failure,
          title: "The clipboard does not contain a valid URL",
          message: "Should be like https://raycast.com or https://raycast.com/?query=raycast#section-1",
        });
        return;
      }
      setDissectedURL(dissectURL(text));
    }
    getUrl();
  }, []);
  return (
    <List isLoading={!dissectedURL && !error}>
      {dissectedURL &&
        Object.entries(dissectedURL).map(
          ([key, value]) =>
            value && (
              <List.Item
                key={key}
                title={key}
                subtitle={value}
                icon={Icon.Text}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard content={value} title={`Copy ${key}`} />
                  </ActionPanel>
                }
              />
            ),
        )}
    </List>
  );
}
