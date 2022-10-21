import { useListRoutingRules } from "./hooks";

import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { deleteRoutingRule } from "./utils";

export default function Command() {
  const [pn, setPn] = useState(1);
  const [countSet, setCountSet] = useState(new Set<string | undefined>([]));

  const { routingRules, isLoadingListRoutingRules } = useListRoutingRules(pn);

  return (
    <List
      isLoading={isLoadingListRoutingRules}
      onSelectionChange={(id) => {
        if (id === null) return;

        setCountSet(countSet.add(id));

        if (countSet.size % 20 === 0) setPn(pn + 1);
      }}
    >
      {routingRules?.map((item) => (
        <List.Item
          id={item.tag}
          subtitle={`${item.matchers[0].value} -> ${item.actions.map((item) => item.value).join(", ")}`}
          title={item.name}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy hide email address" content={item.matchers[0].value} />
              <Action
                title="Delete routing rule"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    !(await confirmAlert({
                      title: "Delete the routing rule?",
                      message: "You will not be able to recover it",
                      icon: Icon.Trash,
                      dismissAction: {
                        title: "Cancel",
                        style: Alert.ActionStyle.Cancel,
                      },
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    }))
                  )
                    return;

                  showToast({ style: Toast.Style.Animated, title: "Deleting routing rule..." });

                  const res = await deleteRoutingRule(item.tag);
                  if (res) {
                    await showHUD("Routing rule deleted");
                    popToRoot();
                  } else {
                    await showHUD("Failed to delete routing rule");
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
