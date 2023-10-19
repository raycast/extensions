import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import executeCommand from "./utils";

interface GetBrightness {
  brightness: number;
}

export default function Command() {
  const [brightness, setBrightness] = useState<number | null>(null);

  const adjustBrightness = async (direction: "increase" | "decrease") => {
    try {
      const adjustment = direction === "increase" ? 0.1 : -0.1;

      const newBrightness = parseFloat(
        Math.min(Math.max((brightness || 0) + adjustment, 0), 1).toFixed(2),
      );

      await executeCommand(["set", String(newBrightness)]);
      setBrightness(newBrightness);

      showToast({
        style: direction === "increase" ? Toast.Style.Success : Toast.Style.Failure,
        title: "Brightness",
        message: `Keyboard Brightness ${
          direction === "increase" ? "increased" : "decreased"
        }!`,
      });
    } catch (e) {
      console.error(e);
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: (e as Error).message,
      });
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { stdout } = await executeCommand(["get"]);
        const { brightness } = JSON.parse(stdout) as GetBrightness;
        setBrightness(brightness);
      } catch (e) {
        console.error(e);
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: (e as Error).message,
        });
      }
    })();
  }, []);

  return (
    <List>
      <List.Item
        id="brightness"
        title="Keyboard Brightness"
        accessories={brightness !== null ? [{ text: `${brightness * 100}%` }] : undefined}
        actions={
          <ActionPanel>
            <Action
              title="Increase Brightness"
              onAction={async () => await adjustBrightness("increase")}
            />
            <Action
              title="Decrease Brightness"
              onAction={async () => await adjustBrightness("decrease")}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
