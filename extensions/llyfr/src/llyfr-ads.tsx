import { useState } from "react";
import { Action, ActionPanel, Form, Icon, getPreferenceValues, useNavigation } from "@raycast/api";

import List from "./Ads/List";

export default function Command() {
  const { push } = useNavigation();
  const [query, setQuery] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const { api_token: ads_api_token } = getPreferenceValues<Preferences.LlyfrAds>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.MagnifyingGlass}
            title="Search ADS"
            onSubmit={() => {
              const q = query.trim();
              if (q !== "") {
                push(<List query={q} ads_api_token={ads_api_token} path={preferences.path} />);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="ADS Query"
        placeholder='e.g. author:"Sironi" year:2016'
        value={query}
        onChange={setQuery}
        autoFocus
      />
    </Form>
  );
}
