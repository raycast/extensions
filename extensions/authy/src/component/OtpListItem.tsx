import { ActionPanel, environment, getPreferenceValues, Icon, List, Action, popToRoot } from "@raycast/api";
import { icondir } from "../constants";
import { icon } from "../util/icon";
import { compare } from "../util/compare";

const { primaryActionIsCopy } = getPreferenceValues<{ primaryActionIsCopy: boolean }>();

function PrimaryAction({ pin }: { pin: string }) {
  return primaryActionIsCopy ? (
    <Action.CopyToClipboard title="Copy OTP" content={pin} onCopy={() => popToRoot()} />
  ) : (
    <Action.Paste title="Output OTP" content={pin} onPaste={() => popToRoot()} />
  );
}

function SecondaryAction({ pin }: { pin: string }) {
  return primaryActionIsCopy ? (
    <Action.Paste title="Output OTP" content={pin} onPaste={() => popToRoot()} />
  ) : (
    <Action.CopyToClipboard title="Copy OTP" content={pin} onCopy={() => popToRoot()} />
  );
}

export interface Otp {
  name: string;
  digits: number;
  generate: () => string;
  issuer?: string;
  logo?: string;
  accountType?: string;
  type: "app" | "service";
}

interface OtpListItemProps {
  item: Otp;
  basis: number;
  timeLeft: number;
  refresh: () => void;
}

export default function OtpListItem({ item, basis, timeLeft, refresh }: OtpListItemProps) {
  const otp = item.generate();
  const subtitle = item.issuer || item.accountType || "";
  const subtitleDisplay = subtitle.match("authenticator") || !compare(subtitle, item.name) ? "" : subtitle;
  const pie = `pie-${basis === 30 ? timeLeft : timeLeft * 3}`;

  return (
    <List.Item
      title={item.name}
      accessoryTitle={`${otp}`}
      subtitle={subtitleDisplay}
      accessoryIcon={{
        source: {
          light: `${environment.assetsPath}/${icondir}/light/${pie}.png`,
          dark: `${environment.assetsPath}/${icondir}/dark/${pie}.png`
        }
      }}
      icon={icon(item)}
      keywords={[subtitle]}
      actions={
        <ActionPanel>
          <PrimaryAction pin={otp ?? ""} />
          <SecondaryAction pin={otp ?? ""} />
          <Action
            title={"Sync"}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={() => refresh()}
          />
        </ActionPanel>
      }
    />
  );
}
