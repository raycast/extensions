import { List, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { SubRecord, getSubRecords } from "./sub-list/api";

import SubListItem from "./sub-list/SubListItem";

export default function Command() {
  const [subs, setSubs] = useState<SubRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const subRecords = await getSubRecords();
      if (subRecords) {
        setSubs(subRecords);
        setIsLoading(false);
      } else {
        showFailureToast("Could not fetch subs", {
          title: "Reset Session Cookie?",
          primaryAction: {
            title: "Reset Cookie",
            onAction: openExtensionPreferences,
          },
        });
      }
    })();
  }, []);

  const generateListItems = () => {
    return subs.map((sub) => {
      return <SubListItem key={sub.instance} {...sub} />;
    });
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Sub Search"
      searchBarPlaceholder="Search by sub or (rproxy, bqio, nuke, etc.)"
    >
      {subs && generateListItems()}
    </List>
  );
}
