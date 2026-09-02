import {
  Action,
  ActionPanel,
  Form,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { toIcaoCallsign, toDisplayFlightNumber } from "./data/airline-codes";
import { refreshMenuBar } from "./utils/menu-bar-refresh";

export default function Command() {
  const { value: storedFlight, isLoading } =
    useLocalStorage<string>("flight-number");

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Track Flight"
            onSubmit={async (values: { flightNumber: string }) => {
              const input = values.flightNumber.trim();
              if (!input) {
                await showToast(
                  Toast.Style.Failure,
                  "Please enter a flight number",
                );
                return;
              }

              const callsign = toIcaoCallsign(input);
              if (!callsign) {
                await showToast(
                  Toast.Style.Failure,
                  "Unknown airline code",
                  `Could not resolve "${toDisplayFlightNumber(input)}"`,
                );
                return;
              }

              await LocalStorage.setItem(
                "flight-number",
                JSON.stringify(input.toUpperCase()),
              );
              // Relaunch the menu bar command while this command is still
              // active, then show the HUD (which dismisses the window).
              await refreshMenuBar();
              await showHUD(`✈ Now tracking ${toDisplayFlightNumber(input)}`);
            }}
          />
          {storedFlight && (
            <Action
              title="Clear Flight"
              style={Action.Style.Destructive}
              onAction={async () => {
                await LocalStorage.removeItem("flight-number");
                await refreshMenuBar();
                await showHUD("✈ Flight tracking cleared");
              }}
            />
          )}
        </ActionPanel>
      }
    >
      {storedFlight && (
        <Form.Description
          title="Currently Tracking"
          text={toDisplayFlightNumber(storedFlight)}
        />
      )}
      <Form.TextField
        id="flightNumber"
        title="Flight Number"
        placeholder="UA745"
        info="IATA flight number (e.g., UA745, DL123, AA100)"
      />
    </Form>
  );
}
