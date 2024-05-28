import { ActionPanel, environment, getPreferenceValues, Icon, List, Action } from "@raycast/api";
import { icondir } from "../constants";
import { icon } from "../util/icon";
import { compareByName } from "../util/compare";
import { addToCache, checkIfCached, getFromCache, RECENTLY_USED } from "../cache";
import { CORRUPTED } from "./OtpList";

const { primaryActionIsCopy, recentlyUsedOrder } = getPreferenceValues<{
  primaryActionIsCopy: boolean;
  recentlyUsedOrder: boolean;
}>();

async function onAction(id: string, index: number, setOtpList: (value: (prev: Otp[]) => Otp[]) => void) {
  if (recentlyUsedOrder) {
    // add usage to cache
    const recentlyUsed = (await checkIfCached(RECENTLY_USED))
      ? new Map<string, number>(await getFromCache(RECENTLY_USED))
      : new Map<string, number>();
    recentlyUsed.set(id, Date.now());
    await addToCache(RECENTLY_USED, Array.from(recentlyUsed.entries()));
    // update current list for users that don't use short timer for pop to root options
    setOtpList((prev) => {
      prev.unshift(prev.splice(index, 1)[0]);
      return prev;
    });
  }
}

function PrimaryAction({ pin, id, index, setOtpList }: ActionProps) {
  return primaryActionIsCopy ? (
    <Action.CopyToClipboard title="Copy OTP" content={pin} onCopy={async () => await onAction(id, index, setOtpList)} />
  ) : (
    <Action.Paste title="Output OTP" content={pin} onPaste={async () => await onAction(id, index, setOtpList)} />
  );
}

function SecondaryAction({ pin, id, index, setOtpList }: ActionProps) {
  return primaryActionIsCopy ? (
    <Action.Paste title="Output OTP" content={pin} onPaste={() => onAction(id, index, setOtpList)} />
  ) : (
    <Action.CopyToClipboard title="Copy OTP" content={pin} onCopy={() => onAction(id, index, setOtpList)} />
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
  index: number;
  item: Otp;
  basis: number;
  timeLeft: number;
  refresh: () => void;
  setOtpList: (value: (prev: Otp[]) => Otp[]) => void;
}

interface ActionProps {
  index: number;
  pin: string;
  id: string;
  setOtpList: (value: (prev: Otp[]) => Otp[]) => void;
}

export default function OtpListItem({ index, item, basis, timeLeft, refresh, setOtpList }: OtpListItemProps) {
  const otp = item.generate();
  const subtitle = item.issuer || item.accountType || "";
  const subtitleDisplay = subtitle.match("authenticator") || !compareByName(subtitle, item.name) ? "" : subtitle;
  const pie = `pie-${basis === 30 ? timeLeft : timeLeft * 3}`;

  return (
    <List.Item
      title={item.name}
      subtitle={subtitleDisplay}
      icon={icon(item)}
      keywords={[subtitle]}
      actions={
        <ActionPanel>
          {otp == CORRUPTED ? (
            <Action.OpenInBrowser title="Submit Issue" url="https://github.com/raycast/extensions/issues/new/choose" />
          ) : (
            <>
              <PrimaryAction pin={otp ?? ""} id={item.id} index={index} setOtpList={setOtpList} />
              <SecondaryAction pin={otp ?? ""} id={item.id} index={index} setOtpList={setOtpList} />
              <Action
                title={"Sync"}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => refresh()}
              />
            </>
          )}
        </ActionPanel>
      }
      accessories={[
        {
          text: `${otp}`,
        },
        {
          icon: {
            source: {
              light: `${environment.assetsPath}/${icondir}/light/${pie}.png`,
              dark: `${environment.assetsPath}/${icondir}/dark/${pie}.png`,
            },
          },
        },
      ]}
    />
  );
}
