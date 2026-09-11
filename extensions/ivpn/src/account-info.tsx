import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Environment,
  Icon,
  PopToRootType,
  Toast,
  closeMainWindow,
  environment,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect } from "react";

import { IvpnAccountInfo, IvpnAccountInfoProvider, useIvpnAccountInfo } from "@/contexts/IvpnAccountInfoContext";
import { IVPN_PAYMENT_URL } from "@/utils/constants";
import { handleError } from "@/utils/errorHandler";

import BrowseServers from "./servers-list";

export default () => (
  <IvpnAccountInfoProvider>
    <AccountInfo />
  </IvpnAccountInfoProvider>
);

function AccountInfo() {
  const { accountInfo, isGettingAccountInfo, accountInfoError, refreshAccountInfo } = useIvpnAccountInfo();
  const { push } = useNavigation();

  if (!accountInfo) return <Detail isLoading />;

  // this includes the "Not Logged In" error, so
  // we can assume the user is logged in after this check
  const { showErrorToast, ErrorComponent } = handleError(accountInfoError, refreshAccountInfo);
  if (ErrorComponent) return <ErrorComponent />;
  showErrorToast?.();

  const isSubscriptionActive = accountInfo!.activeUntil.getTime() > Date.now();

  useEffect(() => {
    if (isGettingAccountInfo) {
      showToast({ title: "Refreshing...", style: Toast.Style.Animated });
    } else {
      showToast({ title: "Refreshed" });
    }
  }, [isGettingAccountInfo]);

  return (
    <Detail
      isLoading={isGettingAccountInfo}
      markdown={formatMarkdown(isSubscriptionActive)}
      metadata={<AccountMetadata info={accountInfo} isSubscriptionActive={isSubscriptionActive} />}
      actions={
        <ActionPanel>
          <Action
            title="Dismiss"
            icon={Icon.ThumbsUp}
            onAction={() => closeMainWindow({ popToRootType: PopToRootType.Immediate })}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={refreshAccountInfo}
            shortcut={{ key: "r", modifiers: ["cmd"] }}
          />
          {isSubscriptionActive ? (
            <Action
              title="Browse Servers"
              icon={Icon.Network}
              onAction={() => push(<BrowseServers />, refreshAccountInfo)}
              shortcut={{ key: "enter", modifiers: ["opt"] }}
            />
          ) : null}
          <Action.OpenInBrowser
            title="Extend Account"
            icon={Icon.Wallet}
            url={IVPN_PAYMENT_URL}
            shortcut={{ key: "enter", modifiers: ["cmd", "opt"] }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Account ID"
              content={accountInfo.accountId}
              shortcut={{ key: "c", modifiers: ["cmd"] }}
            />
            <Action.CopyToClipboard
              title="Copy Device Name"
              content={accountInfo.deviceName}
              shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function formatMarkdown(isSubscriptionActive: boolean) {
  const statusMessages = [
    {
      title: "Subscription Inactive",
      subtitle: "Extend your account to continue using IVPN.",
      icon: `status/disconnected-${environment.appearance}.png`,
    },
    {
      title: "Subscription Active",
      subtitle: "Your account can connect to IVPN.",
      icon: `status/connected-${environment.appearance}.png`,
    },
  ];

  const { icon, title, subtitle } = statusMessages[+isSubscriptionActive];

  const iconSizes: Record<Environment["textSize"], number> = { medium: 130, large: 140 };
  const iconSize = iconSizes[environment.textSize];

  // ! pixel.png is just a 1x1 px transparent square
  // ! it's a hacky way i've found to center elements
  const markdown = `
      ![](pixel.png)
      \n![](pixel.png) <img src="${icon}" width="${iconSize}" height="${iconSize}"> ![](pixel.png)
      \n![](pixel.png) **${title}** ![](pixel.png)
      \n![](pixel.png) *${subtitle}* ![](pixel.png)
    `;

  return markdown.trim().replace(/^ {4}/m, "");
}

function AccountMetadata({ info, isSubscriptionActive }: { info: IvpnAccountInfo; isSubscriptionActive: boolean }) {
  const activeUntil = Intl.DateTimeFormat("us", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(info.activeUntil);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Account ID" text={info.accountId} icon={Icon.PersonCircle} />

      <Detail.Metadata.Label title="Device Name" text={info.deviceName} icon={Icon.Monitor} />

      <Detail.Metadata.TagList title="Plan">
        <Detail.Metadata.TagList.Item
          text={info.plan}
          color={isSubscriptionActive ? Color.Green : Color.SecondaryText}
        />
      </Detail.Metadata.TagList>

      {isSubscriptionActive ? (
        <Detail.Metadata.Label title="Active Until" text={activeUntil} icon={Icon.Calendar} />
      ) : null}
    </Detail.Metadata>
  );
}
