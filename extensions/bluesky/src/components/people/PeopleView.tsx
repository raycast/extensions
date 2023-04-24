import { Action, ActionPanel, Color, Grid, Icon, List, useNavigation } from "@raycast/api";
import {
  BlueskyProfileUrlBase,
  EmptySearchText,
  FollowToastMessage,
  MuteToastMessage,
  OpenUserProfile,
  SearchPeopleSearchBarPlaceholder,
  SearchTitle,
  ShowPeopleViewAsGridCacheKey,
  UnfollowToastMessage,
  UnmuteToastMessage,
  ViewInBrowser,
} from "../../utils/constants";
import { deleteFollow, follow, getProfile, getUsers, mute, unmute } from "../../libs/atp";
import { showDangerToast, showSuccessToast } from "../../utils/common";
import { useEffect, useState } from "react";

import AuthorFeed from "../feed/AuthorFeed";
import CustomAction from "../actions/CustomAction";
import Error from "../error/Error";
import HomeAction from "../actions/HomeAction";
import NavigationDropdown from "../nav/NavigationDropdown";
import Onboard from "../onboarding/Onboard";
import { User } from "../../types/types";
import { parseUsers } from "../../utils/parser";
import { useCachedState } from "@raycast/utils";
import { useDebounce } from "use-debounce";
import useStartATSession from "../../hooks/useStartATSession";

interface PeopleViewProps {
  defaultSearchTerm?: string;
}

const PeopleView = ({ defaultSearchTerm = "" }: PeopleViewProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>(defaultSearchTerm);
  const debouncedTerm = useDebounce<string>(searchTerm, 500);
  const [cursor, setCursor] = useState<string | null>(null);
  const [showPeopleViewAsGrid, setShowPeopleViewAsGrid] = useCachedState(ShowPeopleViewAsGridCacheKey, true);
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  const fetchUsers = async (invalidateCache = false) => {
    const cursorVal = invalidateCache ? null : cursor;
    const data = await getUsers(debouncedTerm[0], cursorVal);

    if (!data) {
      return;
    }

    let newUsers = parseUsers(data.actors);

    if (data.cursor) {
      setCursor(data.cursor);
    } else {
      setCursor(null);
    }

    setUsers((state) => {
      if (invalidateCache) {
        return newUsers;
      }

      const existingIds = new Set(state.map((user) => user.handle));
      newUsers = newUsers.filter((user) => !existingIds.has(user.handle));
      return [...state, ...newUsers];
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
        await fetchUsers(true);
        setIsLoading(false);

        return;
      }

      setUsers([]);
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

    if (users[users.length - 1] && index == users[users.length - 1].handle && cursor) {
      await fetchUsers();
    }
  };

  const onToggleViewType = () => {
    setShowPeopleViewAsGrid((state) => !state);
  };

  const muteUser = async (user: User) => {
    await mute(user.did);
    showDangerToast(`${MuteToastMessage} ${user.handle}`);

    setUsers((state) => {
      const newState = [...state];
      const index = newState.findIndex((u) => u.handle === user.handle);
      newState[index].muted = true;
      return newState;
    });
  };

  const unmuteUser = async (user: User) => {
    await unmute(user.did);
    showSuccessToast(`${UnmuteToastMessage} ${user.handle}`);

    setUsers((state) => {
      const newState = [...state];
      const index = newState.findIndex((u) => u.handle === user.handle);
      newState[index].muted = false;
      return newState;
    });
  };

  const followUser = async (user: User) => {
    await follow(user.did);
    showSuccessToast(`${FollowToastMessage} ${user.handle}`);

    setUsers((state) => {
      const newState = [...state];
      const index = newState.findIndex((u) => u.handle === user.handle);
      newState[index].following = true;
      return newState;
    });
  };

  const unfollowUser = async (user: User) => {
    const profile = await getProfile(user.handle);
    if (profile && profile.viewer && profile.viewer.following) {
      await deleteFollow(profile.viewer.following);

      showDangerToast(`${UnfollowToastMessage} ${user.handle}`);

      setUsers((state) => {
        const newState = [...state];
        const index = newState.findIndex((u) => u.handle === user.handle);
        newState[index].following = false;
        return newState;
      });
    }
  };

  const getListText = (user: User) => {
    let text = `@${user.handle}`;

    if (user.displayName) {
      text += ` - ${user.displayName}`;
    }

    return text;
  };

  const actionPanel = (user: User) => {
    return (
      <ActionPanel>
        <Action
          title={OpenUserProfile}
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          onAction={() =>
            push(<AuthorFeed showNavDropdown={false} previousViewTitle={SearchTitle} authorHandle={user.handle} />)
          }
        />
        <CustomAction
          actionKey="openProfile"
          onClick={() => push(<AuthorFeed showNavDropdown={false} authorHandle={user.handle} />)}
        />
        <Action.OpenInBrowser
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
          title={ViewInBrowser}
          url={`${BlueskyProfileUrlBase}/${user.handle}`}
        />
        {user.following ? (
          <CustomAction actionKey="unfollow" onClick={() => unfollowUser(user)} />
        ) : (
          <CustomAction actionKey="follow" onClick={() => followUser(user)} />
        )}
        {user.muted ? (
          <CustomAction actionKey="unmute" onClick={() => unmuteUser(user)} />
        ) : (
          <CustomAction actionKey="mute" onClick={() => muteUser(user)} />
        )}
        <ActionPanel.Section>
          {showPeopleViewAsGrid ? (
            <CustomAction actionKey="viewAsList" onClick={onToggleViewType} />
          ) : (
            <CustomAction actionKey="viewAsGrid" onClick={onToggleViewType} />
          )}
        </ActionPanel.Section>
        <HomeAction />
      </ActionPanel>
    );
  };

  const homeAction = () => {
    return (
      <ActionPanel>
        <HomeAction />
      </ActionPanel>
    );
  };

  const renderSearchResults = () => {
    return showPeopleViewAsGrid ? (
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
        {searchTerm === "" && users.length === 0 ? (
          <List.EmptyView icon={{ source: Icon.MagnifyingGlass }} title={EmptySearchText} />
        ) : (
          users.map((user) => (
            <Grid.Item
              key={user.handle}
              id={user.handle}
              content={{ source: user.avatarUrl ? user.avatarUrl : Icon.ChessPiece }}
              title={user.displayName}
              subtitle={user.handle}
              actions={actionPanel(user)}
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
        {searchTerm === "" && users.length === 0 ? (
          <List.EmptyView icon={{ source: Icon.MagnifyingGlass }} title={EmptySearchText} />
        ) : (
          users.map((user) => (
            <List.Item
              key={user.handle}
              id={user.handle}
              icon={{ source: user.avatarUrl ? user.avatarUrl : Icon.ChessPiece }}
              title={`${getListText(user)}`}
              subtitle={user.description}
              actions={actionPanel(user)}
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

export default PeopleView;
