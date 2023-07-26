import { Account, RestrictionType } from "../../types/types";
import { Action, ActionPanel, Color, Grid, Icon, List, confirmAlert, useNavigation } from "@raycast/api";
import {
  BlueskyProfileUrlBase,
  FilterAccounts,
  SearchTitle,
  ShowAccountsViewAsGridCacheKey,
  UnblockAccount,
  UnblockAccountConfirm,
  UnblockAccountSuccess,
  ViewInBrowser,
} from "../../utils/constants";
import { getAccountIcon, showSuccessToast } from "../../utils/common";
import { getBlockedAccounts, getMutedAccounts, unblock } from "../../libs/atp";
import { useEffect, useState } from "react";

import AccountActionPanel from "./AccountActionPanel";
import Error from "../error/Error";
import HomeAction from "../actions/HomeAction";
import NavigationDropdown from "../nav/NavigationDropdown";
import Onboard from "../onboarding/Onboard";
import { parseAccounts } from "../../utils/parser";
import { useCachedState } from "@raycast/utils";
import useStartATSession from "../../hooks/useStartATSession";

interface RestrictionAccountsViewProps {
  restrictionType: RestrictionType;
}

const RestrictedAccountsView = ({ restrictionType }: RestrictionAccountsViewProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [showAccountsViewAsGrid, setShowAccountsViewAsGrid] = useCachedState(ShowAccountsViewAsGridCacheKey, true);
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  const fetchAccounts = async (invalidateCache = false) => {
    let data = null;
    let newAccounts: Account[] = [];
    const cursorVal = invalidateCache ? null : cursor;

    if (restrictionType === "mute") {
      data = await getMutedAccounts(cursorVal);

      if (!data) {
        setIsLoading(false);
        return;
      }

      newAccounts = parseAccounts(data.mutes);
    } else {
      data = await getBlockedAccounts(cursorVal);

      if (!data) {
        setIsLoading(false);
        return;
      }

      newAccounts = parseAccounts(data.blocks);
    }

    if (data.cursor) {
      setCursor(data.cursor);
    } else {
      setCursor(null);
    }

    setAccounts((state) => {
      if (invalidateCache) {
        return newAccounts;
      }

      const existingIds = new Set(state.map((account) => account.handle));
      newAccounts = newAccounts.filter((account) => !existingIds.has(account.handle));
      return [...state, ...newAccounts];
    });

    setIsLoading(false);
  };

  useEffect(() => {
    if (sessionStarted) {
      setIsLoading(true);
      fetchAccounts(true);
    }
  }, [sessionStarted]);

  const onSelectionChange = async (index: string | null) => {
    if (!index) {
      return;
    }

    if (accounts[accounts.length - 1] && index == accounts[accounts.length - 1].handle && cursor) {
      await fetchAccounts();
    }
  };

  const onToggleViewType = () => {
    setShowAccountsViewAsGrid((state) => !state);
  };

  const onMuteCallback = (handle: string) => {
    setAccounts((state) => {
      const newState = [...state];
      const index = newState.findIndex((u) => u.handle === handle);
      newState[index].muted = true;
      return newState;
    });
  };

  const unmuteCallback = (handle: string) => {
    setAccounts((state) => {
      const newState = [...state];
      const index = newState.findIndex((u) => u.handle === handle);
      newState[index].muted = false;
      return newState;
    });

    fetchAccounts(true);
  };

  const followAccountCallback = (handle: string) => {
    setAccounts((state) => {
      const newState = [...state];
      const index = newState.findIndex((u) => u.handle === handle);
      newState[index].following = true;
      return newState;
    });
  };

  const unfollowAccountCallback = (handle: string) => {
    setAccounts((state) => {
      const newState = [...state];
      const index = newState.findIndex((u) => u.handle === handle);
      newState[index].following = false;
      return newState;
    });
  };

  const getListText = (account: Account) => {
    let text = `@${account.handle}`;

    if (account.displayName) {
      text += ` - ${account.displayName}`;
    }

    return text;
  };

  const homeAction = () => {
    return (
      <ActionPanel>
        <HomeAction />
      </ActionPanel>
    );
  };

  const onUnblockAccountAction = async (account: Account) => {
    if (await confirmAlert({ title: UnblockAccountConfirm(account.handle) })) {
      await unblock(account);
      showSuccessToast(UnblockAccountSuccess(account.handle));

      fetchAccounts(true);
    }
  };

  const BlockActionPanel = ({ account }: { account: Account }) => {
    return (
      <ActionPanel>
        <Action
          title={UnblockAccount}
          icon={{ source: Icon.PlusCircleFilled, tintColor: Color.Green }}
          onAction={() => onUnblockAccountAction(account)}
        />
        <Action.OpenInBrowser
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
          title={ViewInBrowser}
          url={`${BlueskyProfileUrlBase}/${account.handle}`}
        />
      </ActionPanel>
    );
  };

  const renderSearchResults = () => {
    return showAccountsViewAsGrid ? (
      <Grid
        columns={6}
        isLoading={isLoading}
        onSelectionChange={onSelectionChange}
        actions={homeAction()}
        searchBarPlaceholder={FilterAccounts}
        searchBarAccessory={<NavigationDropdown currentViewId={3} />}
      >
        {accounts.map((account) => (
          <Grid.Item
            key={account.handle}
            id={account.handle}
            content={{
              source: getAccountIcon(account),
            }}
            title={account.displayName}
            subtitle={account.handle}
            actions={
              (restrictionType === "mute" && (
                <AccountActionPanel
                  account={account}
                  showAccountsViewAsGrid={showAccountsViewAsGrid}
                  onFollowCallback={(handle: string) => followAccountCallback(handle)}
                  onUnfollowCallback={(handle: string) => unfollowAccountCallback(handle)}
                  onMuteCallback={(handle: string) => onMuteCallback(handle)}
                  onUnmuteCallback={(handle: string) => unmuteCallback(handle)}
                  onToggleViewType={onToggleViewType}
                />
              )) || <BlockActionPanel account={account} />
            }
          />
        ))}
      </Grid>
    ) : (
      <List
        actions={homeAction()}
        isLoading={isLoading}
        onSelectionChange={onSelectionChange}
        searchBarPlaceholder={FilterAccounts}
        searchBarAccessory={<NavigationDropdown currentViewId={3} />}
      >
        {accounts.map((account) => (
          <List.Item
            key={account.handle}
            id={account.handle}
            icon={{ source: getAccountIcon(account) }}
            title={`${getListText(account)}`}
            subtitle={account.description}
            actions={
              (restrictionType === "mute" && (
                <AccountActionPanel
                  account={account}
                  showAccountsViewAsGrid={showAccountsViewAsGrid}
                  onFollowCallback={(handle: string) => followAccountCallback(handle)}
                  onUnfollowCallback={(handle: string) => unfollowAccountCallback(handle)}
                  onMuteCallback={(handle: string) => onMuteCallback(handle)}
                  onUnmuteCallback={(handle: string) => unmuteCallback(handle)}
                  onToggleViewType={onToggleViewType}
                />
              )) || <BlockActionPanel account={account} />
            }
          />
        ))}
      </List>
    );
  };

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={SearchTitle} />
  ) : (
    renderSearchResults()
  );
};

export default RestrictedAccountsView;
