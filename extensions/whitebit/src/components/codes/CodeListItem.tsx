import { Action, ActionPanel, Color, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { formatNumber } from "../../utils/numbers";

interface Props {
  code: Code;
}

export function CodeListItem({ code }: Props) {
  const statusMap: Record<Code["status"], Color> = {
    Activated: Color.Green,
    New: Color.Blue,
  };

  async function onCodeDecline(code: string) {
    await launchCommand({ name: "code_apply", type: LaunchType.UserInitiated, arguments: { code } });
  }

  return (
    <List.Item
      key={code.external_id}
      title={code.code}
      subtitle={code.ticker}
      keywords={[code.code, code.ticker, code.amount, code.status]}
      accessories={[
        {
          tag: { color: statusMap[code.status], value: "" },
          icon: code.status === "Activated" ? Icon.Check : Icon.Clock,
          tooltip: code.status,
        },
        {
          tag: { value: `${formatNumber(code.amount)} ${code.ticker}` },
          icon: Number(code.amount) < 0 ? Icon.ArrowUp : Icon.ArrowDown,
        },
        { date: new Date(code.date * 1000), tooltip: new Date(code.date * 1000).toDateString() },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={code.code} />
          {code.status === "New" && (
            <Action title="Apply Code to Your Account" onAction={() => onCodeDecline(code.code)} />
          )}
        </ActionPanel>
      }
    />
  );
}
