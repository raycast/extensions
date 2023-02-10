import { getPreferenceValues } from "@raycast/api";
import React, { useState } from "react";
import { Preferences } from "./types/preferences";
import { OpenLinkInListLayout } from "./components/open-link-in-list-layout";
import { getItemInput, getOpenLinkApp } from "./hooks/hooks";
import { OpenLinkInGridLayout } from "./components/open-link-in-grid-layout";

export default function OpenLinkInSpecificBrowser() {
  const { layout } = getPreferenceValues<Preferences>();
  const [refresh, setRefresh] = useState<number>(0);
  const { itemInput } = getItemInput(refresh);
  const { buildInApps, customApps, otherApps, loading } = getOpenLinkApp(itemInput, refresh);

  return layout === "List" ? (
    <OpenLinkInListLayout
      buildInApps={buildInApps}
      customApps={customApps}
      otherApps={otherApps}
      itemInput={itemInput}
      setRefresh={setRefresh}
      loading={loading}
    />
  ) : (
    <OpenLinkInGridLayout
      buildInApps={buildInApps}
      customApps={customApps}
      otherApps={otherApps}
      itemInput={itemInput}
      setRefresh={setRefresh}
      loading={loading}
    />
  );
}
