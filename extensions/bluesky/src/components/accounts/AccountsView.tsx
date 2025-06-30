import { ActionPanel, Grid, Icon, List, useNavigation } from "@raycast/api";
import {
  EmptySearchText,
  SearchPeopleSearchBarPlaceholder,
  SearchTitle,
  ShowAccountsViewAsGridCacheKey,
} from "../../utils/constants";
import { useEffect, useState } from "react";

import { Account } from "../../types/types";
import AccountActionPanel from "./AccountActionPanel";
import Error from "../error/Error";
import HomeAction from "../actions/HomeAction";
import NavigationDropdown from "../nav/NavigationDropdown";
import Onboard from "../onboarding/Onboard";
import { getAccounts } from "../../libs/atp";
import { parseAccounts } from "../../utils/parser";
import { useCachedState } from "@raycast/utils";
import { useDebounce } from "use-debounce";
import useStartATSession from "../../hooks/useStartATSession";

interface AccountsViewProps {
  defaultSearchTerm?: string;
}

const AccountsView = ({ defaultSearchTerm = "" }: AccountsViewProps) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>(defaultSearchTerm);
  const debouncedTerm = useDebounce<string>(searchTerm, 500);
  const [cursor, setCursor] = useState<string | null>(null);
  const [showAccountsViewAsGrid, setShowAccountsViewAsGrid] = useCachedState(ShowAccountsViewAsGridCacheKey, true);
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  const fetchAccounts = async (invalidateCache = false) => {
    const cursorVal = invalidateCache ? null : cursor;
    const data = await getAccounts(debouncedTerm[0], cursorVal);

    if (!data) {
      setIsLoading(false);
      return;
    }

    let newAccounts = parseAccounts(data.actors);

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
  };

  useEffect(() => {
    if (sessionStarted && searchTerm.length < 3) {
      setIsLoading(false);
    }
  }, [sessionStarted]);

  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedTerm[0].length > 2) {
        await fetchAccounts(true);
        setIsLoading(false);

        return;
      }

      setAccounts([]);
      setIsLoading(false);
    };

    if (sessionStarted) {
      fetchResults();
    }
  }, [debouncedTerm[0], sessionStarted]);

  const onSearchTextChange = async (text: string) => {
    setIsLoading(true);
    setSearchTerm(text);
  };

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

  const renderSearchResults = () => {
    return showAccountsViewAsGrid ? (
      <Grid
        columns={6}
        isLoading={isLoading}
        filtering={false}
        searchText={searchTerm}
        onSearchTextChange={onSearchTextChange}
        onSelectionChange={onSelectionChange}
        actions={homeAction()}
        searchBarPlaceholder={SearchPeopleSearchBarPlaceholder}
        searchBarAccessory={<NavigationDropdown currentViewId={3} />}
      >
        {searchTerm === "" && accounts.length === 0 ? (
          <List.EmptyView icon={{ source: Icon.MagnifyingGlass }} title={EmptySearchText} />
        ) : (
          accounts.map((account) => (
            <Grid.Item
              key={account.handle}
              id={account.handle}
              content={{ source: account.avatarUrl ? account.avatarUrl : Icon.ChessPiece }}
              title={account.displayName}
              subtitle={account.handle}
              actions={
                <AccountActionPanel
                  account={account}
                  showAccountsViewAsGrid={showAccountsViewAsGrid}
                  onFollowCallback={(handle: string) => followAccountCallback(handle)}
                  onUnfollowCallback={(handle: string) => unfollowAccountCallback(handle)}
                  onMuteCallback={(handle: string) => onMuteCallback(handle)}
                  onUnmuteCallback={(handle: string) => unmuteCallback(handle)}
                  onToggleViewType={onToggleViewType}
                />
              }
            />
          ))
        )}
      </Grid>
    ) : (
      <List
        actions={homeAction()}
        isLoading={isLoading}
        searchText={searchTerm}
        filtering={false}
        onSearchTextChange={onSearchTextChange}
        onSelectionChange={onSelectionChange}
        searchBarPlaceholder={SearchPeopleSearchBarPlaceholder}
        searchBarAccessory={<NavigationDropdown currentViewId={3} />}
      >
        {searchTerm === "" && accounts.length === 0 ? (
          <List.EmptyView icon={{ source: Icon.MagnifyingGlass }} title={EmptySearchText} />
        ) : (
          accounts.map((account) => (
            <List.Item
              key={account.handle}
              id={account.handle}
              icon={{ source: account.avatarUrl ? account.avatarUrl : Icon.ChessPiece }}
              title={`${getListText(account)}`}
              subtitle={account.description}
              actions={
                <AccountActionPanel
                  account={account}
                  showAccountsViewAsGrid={showAccountsViewAsGrid}
                  onFollowCallback={(handle: string) => followAccountCallback(handle)}
                  onUnfollowCallback={(handle: string) => unfollowAccountCallback(handle)}
                  onMuteCallback={(handle: string) => onMuteCallback(handle)}
                  onUnmuteCallback={(handle: string) => unmuteCallback(handle)}
                  onToggleViewType={onToggleViewType}
                />
              }
            />
          ))
        )}
      </List>
    );
  };

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={SearchTitle} />
  ) : (
    renderSearchResults()
  );
};

export default AccountsView;
