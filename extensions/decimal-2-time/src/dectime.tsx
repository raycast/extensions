import {
  List,
  ActionPanel,
  Action,
  LaunchProps,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect } from "react";

function toTime(decimal: number): string {
  const totalSeconds = Math.round(decimal * 3600);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function toDecimal(time: string): number {
  const parts = time.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  const seconds = parseInt(parts[2] || "0", 10);
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return NaN;
  if (hours < 0 || minutes < 0 || seconds < 0) return NaN;
  return hours + minutes / 60 + seconds / 3600;
}

function convert(input: string): { result: string; subtitle: string } | null {
  const hasColon = input.includes(":");

  if (hasColon) {
    const decimal = toDecimal(input);
    if (isNaN(decimal)) return null;
    const formatted = parseFloat(decimal.toFixed(6)).toString();
    return { result: formatted, subtitle: `${input} → Decimal` };
  } else {
    const num = parseFloat(input);
    if (isNaN(num) || num < 0) return null;
    const time = toTime(num);
    return { result: time, subtitle: `${input} → Time` };
  }
}

export default function Command(
  props: LaunchProps<{ arguments: { value: string } }>,
) {
  const input = props.arguments.value.trim();
  const { autoCopy } = getPreferenceValues<Preferences.Dectime>();
  const conversion = input ? convert(input) : null;

  useEffect(() => {
    if (autoCopy && conversion) {
      Clipboard.copy(conversion.result).then(() => {
        showToast({
          style: Toast.Style.Success,
          title: `Copied ${conversion.result}`,
        });
      });
    }
  }, []);

  return (
    <List>
      {conversion ? (
        <List.Item
          title={conversion.result}
          subtitle={
            autoCopy ? `${conversion.subtitle} (copied)` : conversion.subtitle
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={conversion.result} />
              <Action.Paste content={conversion.result} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title="No Result"
          description="Enter a decimal (3.4322) or time (01:30:00)"
        />
      )}
    </List>
  );
}
