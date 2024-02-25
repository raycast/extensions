import { ActionPanel, Action, Form } from "@raycast/api";
import { useCallback, useState } from "react";
import { ListView } from "./ListView";
import { toCookiesObject } from "./utils";

export default function Command() {
  const [cookies, setCookies] = useState<Record<string, string>>({});
  const onSearchTextChange = useCallback((searchText: string) => {
    if (!searchText.trim()) {
      setCookies({});
      return;
    }

    setCookies(toCookiesObject(searchText));
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.Push title="Open In Detail View" target={<ListView cookies={cookies} />} />
        </ActionPanel>
      }
    >
      <Form.TextArea id={"cookies-text"} onChange={onSearchTextChange} placeholder="Foo=; Bar="></Form.TextArea>
    </Form>
  );
}
