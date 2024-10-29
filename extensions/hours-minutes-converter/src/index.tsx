import { showToast, Toast, List, ActionPanel, Action } from "@raycast/api";

interface CommandArguments {
  time: string;
}

export default function Command({ arguments: { time } }: { arguments: CommandArguments }) {
  function convertTime(time: string): { valid: boolean; output?: string; message?: string } {
    const colonSplit = time.split(":");
    if (colonSplit.length === 2) {
      const [hoursStr, minutesStr] = colonSplit;
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (isNaN(hours) || isNaN(minutes)) {
        return { valid: false, message: "Invalid entry. Use 'hh:mm' or 'decimal' format." };
      }
      const decimalTime = hours + minutes / 60;
      return { valid: true, output: decimalTime.toFixed(2) };
    }

    const decimalStr = time.replace(",", ".");
    const decimalSplit = decimalStr.split(".");
    if (decimalSplit.length === 2) {
      const hours = parseInt(decimalSplit[0], 10);
      const minutes = Math.round(parseFloat(`0.${decimalSplit[1]}`) * 60);
      if (isNaN(hours) || isNaN(minutes)) {
        return { valid: false, message: "Invalid entry. Use 'hh:mm' or 'decimal' format." };
      }
      return { valid: true, output: `${hours}:${minutes < 10 ? "0" : ""}${minutes}` };
    }

    return { valid: false, message: "Invalid entry. Use 'hh:mm' or 'decimal' format." };
  }

  const { valid, output, message } = convertTime(time);

  return (
    <List navigationTitle="Time converter">
      <List.Item
        title={valid ? `Result: ${output}` : "Invalid input"}
        subtitle={valid ? "" : message}
        actions={
          <ActionPanel>
            {valid && <Action.CopyToClipboard content={output!} title="Copy" />}
            {!valid && (
              <Action title="Sluit" onAction={() => showToast({ style: Toast.Style.Failure, title: message || "" })} />
            )}
          </ActionPanel>
        }
      />
    </List>
  );
}
