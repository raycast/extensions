import { Action, ActionPanel, Form, Icon, popToRoot, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchItemInput } from "./utils/input";
import { makeSearchURL } from "./utils/url";
import { Preferences } from "./utils/types";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(preferences.useSelected);

  // Get highlighted or copied text if preferred.
  useEffect(() => {
    async function _fetchItemInput() {
      const inputItem = await fetchItemInput();
      setQuery(inputItem);
      setIsLoading(false);
    }
    if (preferences.useSelected) {
      _fetchItemInput().then();
    }
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={makeSearchURL(query)} icon={Icon.Globe} onOpen={() => popToRoot()} />
          <Action.CopyToClipboard content={makeSearchURL(query)} icon={Icon.Clipboard} onCopy={() => popToRoot()} />
        </ActionPanel>
      }
    >
      <Form.TextField id="search" title="Search" placeholder="Location or Category" value={query} onChange={setQuery} />
    </Form>
  );
}
