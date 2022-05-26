import { Form, ActionPanel, Icon, popToRoot, Action } from "@raycast/api";
import { useState } from "react";
import { makeSearchURL } from "./utils";

export default function Command() {
  const [query, setQuery] = useState<string>("");

  return (
    <Form
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
