import { Action, ActionPanel, List, Toast, open, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { THAW_ACTIONS } from "@data";
import { THAW_INSTALL_URL, isThawInstalled, openThawUrl } from "@utils";

export default function Command() {
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    isThawInstalled().then((result: boolean) => {
      setInstalled(result);
      if (!result) {
        showToast({
          style: Toast.Style.Failure,
          title: "Thaw Not Installed",
          message: "Get it at github.com/stonerl/Thaw",
          primaryAction: {
            title: "Open GitHub Page",
            onAction: () => open(THAW_INSTALL_URL),
          },
        });
      }
    });
  }, []);

  return (
    <List isLoading={installed === null} searchBarPlaceholder="Search for an action...">
      {installed === false ? (
        <List.EmptyView title="Thaw Not Installed" description={`Get Thaw from ${THAW_INSTALL_URL}`} />
      ) : (
        THAW_ACTIONS.map((action) => (
          <List.Item
            key={action.id}
            title={action.title}
            subtitle={action.subtitle}
            actions={
              <ActionPanel>
                <Action title="Run Action" onAction={() => openThawUrl(action.id, `${action.title} toggled`)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
