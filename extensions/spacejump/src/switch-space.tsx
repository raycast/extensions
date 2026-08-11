import { ActionPanel, Action, List, Icon, open, popToRoot, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Space, getSpaces } from "./utils";

export default function Command() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSpaces()
      .then(setSpaces)
      .catch((err: unknown) => {
        // JSON.parse throws SyntaxError when SpaceJump is mid-write of the
        // state file. Surface a clear message rather than the misleading
        // "not running" toast in that case.
        if (err instanceof SyntaxError) {
          showToast({
            style: Toast.Style.Failure,
            title: "State file busy",
            message: "SpaceJump is updating its state, try again",
          });
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        showToast({ style: Toast.Style.Failure, title: "SpaceJump not running", message });
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Type space name to jump...">
      {spaces
        .filter((s) => !s.isCurrent)
        .map((space) => (
          <List.Item
            key={String(space.id)}
            icon={{ source: Icon.Dot, tintColor: space.colorHex }}
            title={space.name}
            subtitle={`Desktop ${space.index}`}
            actions={
              <ActionPanel>
                <Action
                  title="Jump"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    await open(`spacejump://switch?name=${encodeURIComponent(space.name)}`);
                    await popToRoot();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
