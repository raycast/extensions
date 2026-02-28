import { useState } from "react";
import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";

import List from "./Ads/List";
import { ValidatePreferences } from "./Ads/Preferences";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const ads_preferences = getPreferenceValues<Preferences.LlyfrAds>();
  const validation = ValidatePreferences(ads_preferences);
  if (!validation.status) {
    return validation.component;
  }
  const ads_api_token = validation.api_token;

  const { push } = useNavigation();
  const [query, setQuery] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
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
