import {
  ActionPanel,
  CopyToClipboardAction,
  environment,
  getPreferenceValues,
  Icon,
  List,
  PasteAction,
} from "@raycast/api";
import { icondir } from "../constants";
import { icon } from "../util/icon";
import { compare } from "../util/compare";

const { primaryActionIsCopy } = getPreferenceValues<{ primaryActionIsCopy: boolean }>();

function PrimaryAction({ pin }: { pin: string }) {
  return primaryActionIsCopy ? (
    <CopyToClipboardAction title="Copy OTP" content={pin} />
  ) : (
    <PasteAction title="Output OTP" content={pin} />
  );
}

function SecondaryAction({ pin }: { pin: string }) {
  return primaryActionIsCopy ? (
    <PasteAction title="Output OTP" content={pin} />
  ) : (
    <CopyToClipboardAction title="Copy OTP" content={pin} />
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
          dark: `${environment.assetsPath}/${icondir}/dark/${pie}.png`,
        },
      }}
      icon={icon(item)}
      keywords={[subtitle]}
      actions={
        <ActionPanel>
          <PrimaryAction pin={otp ?? ""} />
          <SecondaryAction pin={otp ?? ""} />
          <ActionPanel.Item
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
