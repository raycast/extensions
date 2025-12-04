import { UserVal, Val } from "../types";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { UserProfile } from "../actions/UserProfile";
import { formatDistance } from "date-fns";
import { muteIfPrivate } from "../helpers";
import { ValDetails } from "./ValDetails";
import { getAvatarIcon } from "@raycast/utils";
import { RunValAction } from "../actions/RunValAction";

type SingleValProps = {
  val: Val | UserVal;
  isShowingDetail: boolean;
  includeVisibility?: boolean;
  forceShowUsername?: boolean;
  onMainAction: () => void;
};

export const SingleVal = ({
  val,
  isShowingDetail,
  onMainAction,
  includeVisibility = true,
  forceShowUsername = false,
}: SingleValProps) => {
  const { name, author, id, public: p, privacy, runStartAt } = val;
  const icon = getAvatarIcon(name, { gradient: false });
  return (
    <List.Item
      key={`val-${id}`}
      title={name}
      subtitle={isShowingDetail || forceShowUsername ? author.username : undefined}
      icon={icon}
      actions={
        <ActionPanel>
          <Action title="Toggle Details" icon={Icon.AppWindowSidebarLeft} onAction={onMainAction} />
          <RunValAction val={val} />
          <Action.OpenInBrowser
            url={`https://www.val.town/v/${author.username}.${name}`}
            title="View on Val Town"
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard content={val.id} title="Copy Val ID" icon={Icon.Clipboard} />
          <UserProfile profile={author} />
        </ActionPanel>
      }
      detail={<ValDetails valId={id} />}
      accessories={[
        {
          tooltip: `Last run at ${runStartAt}`,
          text: isShowingDetail ? undefined : formatDistance(new Date(runStartAt), new Date(), { addSuffix: true }),
        },
        {
          tooltip: p ? "Public" : privacy === "unlisted" ? `Unlisted (private)` : `Private`,
          icon: includeVisibility
            ? {
                source: p ? Icon.Eye : Icon.EyeDisabled,
                tintColor: muteIfPrivate(p),
              }
            : undefined,
        },
      ]}
    />
  );
};
