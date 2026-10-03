import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { controller, errorMessage } from "./backend";
import { Display } from "./core";

export default function Command() {
  const [displays, setDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const busy = useRef(false);
  const run = useCallback(async (operation: () => Promise<Display[]>, title?: string) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(undefined);
    try {
      setDisplays(await operation());
      if (title) await showToast({ style: Toast.Style.Success, title });
    } catch (error) {
      const message = errorMessage(error);
      setError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Display Switch",
        message,
      });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void run(() => controller.list());
  }, [run]);
  const commonActions = (
    <>
      <Action
        title="Enable All Displays"
        icon={Icon.Power}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        onAction={() => run(() => controller.enableAll(), "All displays enabled")}
      />
      <Action
        title="Refresh Displays"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => run(() => controller.list())}
      />
    </>
  );
  return (
    <List isLoading={loading} searchBarPlaceholder="Find a display to turn on or off…">
      <List.EmptyView
        title={error ? "Could Not Read Displays" : "No Displays Found"}
        description={error ?? "Connect a display and refresh."}
        icon={Icon.Desktop}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
      {displays.map((display) => (
        <List.Item
          key={display.id}
          title={display.name}
          subtitle={display.builtIn ? "Built-in" : display.width ? `${display.width} × ${display.height}` : "External"}
          keywords={[display.id, display.enabled ? "on enabled" : "off disabled"]}
          icon={{
            source: Icon.Desktop,
            tintColor: display.enabled ? Color.Green : Color.SecondaryText,
          }}
          accessories={[
            ...(display.main ? [{ text: "Main" }] : []),
            ...(display.mirrored ? [{ text: "Mirrored" }] : []),
            {
              tag: {
                value: display.enabled ? "On" : "Off",
                color: display.enabled ? Color.Green : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={display.enabled ? "Turn Display off" : "Turn Display on"}
                icon={Icon.Power}
                onAction={() =>
                  run(
                    () => controller.set(display.id, !display.enabled),
                    `${display.name} turned ${display.enabled ? "off" : "on"}`,
                  )
                }
              />
              {commonActions}
              <Action.CopyToClipboard title="Copy Display UUID" content={display.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
