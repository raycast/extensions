import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { Run } from "../types";
import { getAvatarIcon } from "@raycast/utils";
import { formatDistance } from "date-fns";
import { muteIfPrivate } from "../helpers";
import { ValDetails } from "./ValDetails";
import { UserProfile } from "../actions/UserProfile";
import { RunValAction } from "../actions/RunValAction";

type RunProps = {
  runs: Run[];
  isShowingDetail: boolean;
  setShowDetail: React.Dispatch<React.SetStateAction<boolean>>;
};

export const Runs = ({ runs, setShowDetail, isShowingDetail }: RunProps) => (
  <>
    {runs.map(({ id, val, runStartAt }) => {
      const { name, author, public: p, privacy } = val;
      const icon = getAvatarIcon(name, { gradient: false });
      return (
        <List.Item
          icon={icon}
          key={`run-${id}`}
          title={name}
          subtitle={author.username}
          actions={
            <ActionPanel>
              <Action
                title="Toggle Val Details"
                icon={Icon.AppWindowSidebarLeft}
                onAction={() => setShowDetail((visible) => !visible)}
              />
              <RunValAction val={val} />
              <Action.OpenInBrowser
                url={`https://www.val.town/v/${author.username}.${name}`}
                title="View on Val Town"
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <UserProfile profile={author} />
            </ActionPanel>
          }
          detail={<ValDetails valId={val.id} />}
          accessories={[
            {
              tooltip: `Last run at ${runStartAt}`,
              text: isShowingDetail ? undefined : formatDistance(new Date(runStartAt), new Date(), { addSuffix: true }),
            },
            {
              tooltip: p ? "Public" : privacy === "unlisted" ? `Unlisted (private)` : `Private`,
              icon: {
                source: p ? Icon.Eye : Icon.EyeDisabled,
                tintColor: muteIfPrivate(p),
              },
            },
          ]}
        />
      );
    })}
  </>
);
