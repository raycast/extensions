import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  List,
  Icon,
  Keyboard,
  confirmAlert,
  openExtensionPreferences,
} from "@raycast/api";
import { BASE_COLOURS, Command, attemptSummary, commandLabel, colourLabel, stateSummary } from "./luxafor-state";
import { confirmRedTest } from "./luxafor-service";
import CustomColour from "./custom-colour";
import { useController } from "./use-controller";

export default function ControlLuxafor() {
  const { state, loading, notice, refresh, send, clearRecent } = useController();
  const commands: Command[] = [
    { kind: "solid", colour: "off" },
    ...Object.keys(BASE_COLOURS).map((colour) => ({ kind: "solid" as const, colour })),
  ];
  const test = () =>
    confirmRedTest(
      () =>
        confirmAlert({
          title: "Send a Red Test?",
          message:
            "This sends one red light command. It does not restore the previous color. API acceptance cannot confirm that the device changed.",
          primaryAction: { title: "Send Red" },
          dismissAction: { title: "Cancel" },
        }),
      () => send({ kind: "solid", colour: "red" }),
    );
  return (
    <List isLoading={loading} searchBarPlaceholder="Find a color or action">
      <List.Section title="Request History" subtitle="Not live device status">
        <List.Item
          title={
            state.accepted ? `Last API-accepted: ${commandLabel(state.accepted.command)}` : "No API-accepted command"
          }
          subtitle={notice ?? attemptSummary(state)}
          icon={Icon.Info}
          accessories={
            state.accepted ? [{ date: new Date(state.accepted.acceptedAt), tooltip: stateSummary(state) }] : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="View Request Details"
                target={
                  <Detail
                    markdown={`# Request history

${stateSummary(state)}

${attemptSummary(state)}

${notice ?? ""}

API acceptance is not physical telemetry. Check the light before resending an uncertain request. If it did not change, check your User ID, Luxafor app, Webhook mode, device connection and internet access.`}
                  />
                }
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action
                title="Refresh History"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={refresh}
              />
              <Action title="Send Red Test…" icon={Icon.ExclamationMark} onAction={test} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Custom and Recent Colors">
        <List.Item
          title="Set Custom Color"
          subtitle="#RGB or #RRGGBB"
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action.Push title="Enter Hex Color" target={<CustomColour />} onPop={refresh} />
            </ActionPanel>
          }
        />
        {state.recent.map((colour) => (
          <List.Item
            key={colour}
            title={colourLabel(colour)}
            subtitle="Recent API-accepted choice"
            icon={Icon.Circle}
            actions={
              <ActionPanel>
                <Action title="Set Color" onAction={() => send({ kind: "solid", colour })} />
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                <Action
                  title="Clear Recent Colors"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Clear Recent Colors?",
                        message: "This clears the recent list without changing the light or accepted history.",
                        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                      })
                    )
                      await clearRecent();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        {state.legacyColour && (
          <List.Item
            title={colourLabel(state.legacyColour)}
            subtitle="Previous saved choice · unverified"
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action title="Set Saved Color" onAction={() => send({ kind: "solid", colour: state.legacyColour! })} />
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                <Action
                  title="Forget Saved Choice"
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Forget Saved Choice?",
                        message: "This removes the migrated choice without changing the light or accepted history.",
                        primaryAction: { title: "Forget", style: Alert.ActionStyle.Destructive },
                      })
                    )
                      await clearRecent(true);
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Light Controls">
        {commands.map((command) => (
          <List.Item
            key={command.colour}
            title={commandLabel(command)}
            subtitle={
              command.colour === "red"
                ? "Busy"
                : command.colour === "green"
                  ? "Available"
                  : "Send a solid color command"
            }
            icon={command.colour === "off" ? Icon.Power : Icon.Circle}
            actions={
              <ActionPanel>
                <Action
                  title={command.colour === "off" ? "Turn off" : `Set ${commandLabel(command)}`}
                  onAction={() => send(command)}
                />
                <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                {command.colour !== "off" && (
                  <Action
                    title={`Blink ${commandLabel(command)}`}
                    onAction={() => send({ ...command, kind: "blink" })}
                  />
                )}
                <Action title="Refresh History" shortcut={Keyboard.Shortcut.Common.Refresh} onAction={refresh} />
                <Action title="Send Red Test…" onAction={test} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
