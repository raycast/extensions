import { ActionPanel, environment, getPreferenceValues, Icon, List, Action } from "@raycast/api";
import { icondir } from "../constants";
import { icon } from "../util/icon";
import { compareByName } from "../util/compare";
import { addToCache, checkIfCached, getFromCache, RECENTLY_USED } from "../cache";

const { primaryActionIsCopy, recentlyUsedOrder } = getPreferenceValues<{
  primaryActionIsCopy: boolean;
  recentlyUsedOrder: boolean;
}>();

async function onAction(id: string) {
  if (recentlyUsedOrder) {
    const recentlyUsed = (await checkIfCached(RECENTLY_USED))
      ? new Map<string, number>(await getFromCache(RECENTLY_USED))
      : new Map<string, number>();
    recentlyUsed.set(id, Date.now());
    await addToCache(RECENTLY_USED, Array.from(recentlyUsed.entries()));
  }
}

function PrimaryAction({ pin, id }: { pin: string; id: string }) {
  return primaryActionIsCopy ? (
    <Action.CopyToClipboard title="Copy OTP" content={pin} onCopy={() => onAction(id)} />
  ) : (
    <Action.Paste title="Output OTP" content={pin} onPaste={() => onAction(id)} />
  );
}

function SecondaryAction({ pin, id }: { pin: string; id: string }) {
  return primaryActionIsCopy ? (
    <Action.Paste title="Output OTP" content={pin} onPaste={() => onAction(id)} />
  ) : (
    <Action.CopyToClipboard title="Copy OTP" content={pin} onCopy={() => onAction(id)} />
  );
}

export interface Otp {
  id: string;
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
  const subtitleDisplay = subtitle.match("authenticator") || !compareByName(subtitle, item.name) ? "" : subtitle;
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
          <PrimaryAction pin={otp ?? ""} id={item.id} />
          <SecondaryAction pin={otp ?? ""} id={item.id} />
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
