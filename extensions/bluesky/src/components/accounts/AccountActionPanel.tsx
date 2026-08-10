import { Action, ActionPanel, Color, Icon, useNavigation } from "@raycast/api";
import {
  BlueskyProfileUrlBase,
  FollowToastMessage,
  MuteToastMessage,
  OpenProfile,
  SearchTitle,
  UnfollowToastMessage,
  UnmuteToastMessage,
  ViewInBrowser,
} from "../../utils/constants";
import { deleteFollow, follow, getProfile, mute, unmute } from "../../libs/atp";
import { showDangerToast, showSuccessToast } from "../../utils/common";

import { Account } from "../../types/types";
import AuthorFeed from "../feed/AuthorFeed";
import CustomAction from "../actions/CustomAction";
import HomeAction from "../actions/HomeAction";

interface Props {
  account: Account;
  showAccountsViewAsGrid: boolean;
  onMuteCallback: (handle: string) => void;
  onUnmuteCallback: (handle: string) => void;
  onFollowCallback: (handle: string) => void;
  onUnfollowCallback: (handle: string) => void;
  onToggleViewType: () => void;
}

const AccountActionPanel = ({
  account,
  showAccountsViewAsGrid,
  onMuteCallback,
  onUnmuteCallback,
  onFollowCallback,
  onUnfollowCallback,
  onToggleViewType,
}: Props) => {
  const { push } = useNavigation();

  const muteAccount = async (account: Account) => {
    await mute(account.did);
    showDangerToast(`${MuteToastMessage} ${account.handle}`);

    onMuteCallback(account.handle);
  };

  const unmuteAccount = async (account: Account) => {
    await unmute(account.did);
    showSuccessToast(`${UnmuteToastMessage} ${account.handle}`);

    onUnmuteCallback(account.handle);
  };

  const followAccount = async (account: Account) => {
    await follow(account.did);
    showSuccessToast(`${FollowToastMessage} ${account.handle}`);

    onFollowCallback(account.handle);
  };

  const unfollowAccount = async (account: Account) => {
    const profile = await getProfile(account.handle);
    if (profile && profile.viewer && profile.viewer.following) {
      await deleteFollow(profile.viewer.following);

      showDangerToast(`${UnfollowToastMessage} ${account.handle}`);

      onUnfollowCallback(account.handle);
    }
  };

  return (
    <ActionPanel>
      <Action
        title={OpenProfile}
        icon={{ source: Icon.Person, tintColor: Color.Blue }}
        onAction={() =>
          push(<AuthorFeed showNavDropdown={false} previousViewTitle={SearchTitle} authorHandle={account.handle} />)
        }
      />
      <CustomAction
        actionKey="openProfile"
        onClick={() => push(<AuthorFeed showNavDropdown={false} authorHandle={account.handle} />)}
      />
      <Action.OpenInBrowser
        icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        title={ViewInBrowser}
        url={`${BlueskyProfileUrlBase}/${account.handle}`}
      />
      {account.following ? (
        <CustomAction actionKey="unfollow" onClick={() => unfollowAccount(account)} />
      ) : (
        <CustomAction actionKey="follow" onClick={() => followAccount(account)} />
      )}
      {account.muted ? (
        <CustomAction actionKey="unmute" onClick={() => unmuteAccount(account)} />
      ) : (
        <CustomAction actionKey="mute" onClick={() => muteAccount(account)} />
      )}
      <ActionPanel.Section>
        {showAccountsViewAsGrid ? (
          <CustomAction actionKey="viewAsList" onClick={onToggleViewType} />
        ) : (
          <CustomAction actionKey="viewAsGrid" onClick={onToggleViewType} />
        )}
      </ActionPanel.Section>
      <HomeAction />
    </ActionPanel>
  );
};

export default AccountActionPanel;
