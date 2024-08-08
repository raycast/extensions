import { ActionPanel, Color, List } from "@raycast/api";
import { icon } from "../../util/icon";
import { compareByName } from "../../util/compare";
import { getProgressIcon } from "@raycast/utils";
import { Service } from "../../util/service";
import { generateTOTP } from "../../util/totp";
import { CORRUPTED, otpActions, setItemsFunction } from "./otp-helpers";

interface OtpListItemProps {
  index: number;
  item: Service;
  timeLeft: number;
  setItems: setItemsFunction;
}

export default function OtpListItem({
  index,
  item,
  timeLeft,
  setItems,
}: OtpListItemProps) {
  const otp =
    item.seed != null
      ? generateTOTP(item.seed, {
          digits: item.digits,
          period: item.period,
          timestamp: new Date().getTime(),
        })
      : CORRUPTED;
  const subtitle = item.issuer || item.accountType || "";
  const subtitleDisplay =
    subtitle.match("authenticator") || !compareByName(subtitle, item.name)
      ? ""
      : subtitle;
  const progress = (100 - Math.round((timeLeft / item.period) * 100)) / 100;

  return (
    <List.Item
      title={item.name}
      subtitle={subtitleDisplay}
      icon={icon(item)}
      keywords={[subtitle]}
      actions={
        <ActionPanel>{otpActions(otp, item.id, index, setItems)}</ActionPanel>
      }
      accessories={[
        {
          tag: `${otp}`,
        },
        {
          icon: {
            source: {
              light: getProgressIcon(progress, "#CCC", {
                background: Color.PrimaryText,
                backgroundOpacity: 1,
              }),
              dark: getProgressIcon(progress, "#333", {
                background: Color.PrimaryText,
                backgroundOpacity: 1,
              }),
            },
          },
        },
      ]}
    />
  );
}
