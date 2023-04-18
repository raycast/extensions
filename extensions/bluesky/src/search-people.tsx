import { Action, ActionPanel, Color, Grid, Icon, List, useNavigation } from "@raycast/api";
import {
  BlueskyProfileUrlBase,
  FollowToastMessage,
  MuteToastMessage,
  OpenUserProfile,
  SearchPeopleSearchBarPlaceholder,
  SearchPeopleTitle,
  SearchPeopleViewOpenedToast,
  ShowPeopleViewAsGridCacheKey,
  UnfollowToastMessage,
  UnmuteToastMessage,
  ViewInBrowser,
} from "./utils/constants";
import { buildTitle, showDangerToast, showSuccessToast } from "./utils/common";
import { deleteFollow, follow, getProfile, getUsers, mute, unmute } from "./libs/atp";
import { useEffect, useState } from "react";

import AuthorFeed from "./components/feed/AuthorFeed";
import CustomAction from "./components/actions/CustomAction";
import Error from "./components/error/Error";
import HomeAction from "./components/actions/HomeAction";
import NavigationDropdown from "./components/nav/NavigationDropdown";
import Onboard from "./components/onboarding/Onboard";
import { User } from "./types/types";
import { parseUsers } from "./utils/parser";
import { useCachedState } from "@raycast/utils";
import { useDebounce } from "use-debounce";
import useStartATSession from "./hooks/useStartATSession";

interface SearchTitleProps {
  previousViewTitle?: string;
}

export default function SearchPeople({ previousViewTitle = "" }: SearchTitleProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedTerm = useDebounce<string>(searchTerm, 500);
  const [cursor, setCursor] = useState<string | null>(null);
  const [showPeopleViewAsGrid, setShowPeopleViewAsGrid] = useCachedState(ShowPeopleViewAsGridCacheKey, false);
  const { push } = useNavigation();
  const [sessionStarted, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));
  const fetchUsers = async (resetList = false) => {
    const cursorVal = resetList ? null : cursor;
    const data = await getUsers(debouncedTerm[0], cursorVal);

    if (!data) {
      return;
    }

    let newUsers = parseUsers(data.actors);

    if (data.cursor) {
      setCursor(data.cursor);
    }

    setUsers((state) => {
      if (resetList) {
        return newUsers;
      }

      const existingIds = new Set(state.map((user) => user.handle));
      newUsers = newUsers.filter((user) => !existingIds.has(user.handle));
      return [...state, ...newUsers];
    });
  };

  useEffect(() => {
    if (sessionStarted) {
      showSuccessToast(SearchPeopleViewOpenedToast);
    }
  }, [sessionStarted]);

  useEffect(() => {
    (async () => {
      if (debouncedTerm[0].length > 2) {
        await fetchUsers(true);
        setIsLoading(false);
      }
    })();
  }, [debouncedTerm[0]]);

  const onSearchTextChange = async (text: string) => {
    setIsLoading(true);
    setSearchTerm(text);
  };

  const onSelectionChange = async (index: string | null) => {
    if (!index) {
      return;
    }

    if (index == users[users.length - 1].handle && cursor) {
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
            push(
              <AuthorFeed
                previousViewTitle={buildTitle(previousViewTitle, SearchPeopleTitle)}
                authorHandle={user.handle}
              />
            )
          }
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

  const peopleView = () => {
    return showPeopleViewAsGrid ? (
      <Grid
        isLoading={isLoading}
        filtering={false}
        onSearchTextChange={onSearchTextChange}
        onSelectionChange={onSelectionChange}
        actions={homeAction()}
        navigationTitle={buildTitle(previousViewTitle, SearchPeopleTitle)}
        searchBarPlaceholder={SearchPeopleSearchBarPlaceholder}
        searchBarAccessory={<NavigationDropdown currentViewId={3} />}
      >
        {users.map((user) => (
          <Grid.Item
            key={user.handle}
            id={user.handle}
            content={{ source: user.avatarUrl ? user.avatarUrl : Icon.ChessPiece }}
            title={user.displayName}
            subtitle={user.handle}
            actions={actionPanel(user)}
          />
        ))}
      </Grid>
    ) : (
      <List
        actions={homeAction()}
        isLoading={isLoading}
        filtering={false}
        onSearchTextChange={onSearchTextChange}
        onSelectionChange={onSelectionChange}
        navigationTitle={buildTitle(previousViewTitle, SearchPeopleTitle)}
        searchBarPlaceholder={SearchPeopleSearchBarPlaceholder}
        searchBarAccessory={<NavigationDropdown currentViewId={3} />}
      >
        {users.map((user) => (
          <List.Item
            key={user.handle}
            id={user.handle}
            icon={{ source: user.avatarUrl ? user.avatarUrl : Icon.ChessPiece }}
            title={`${getListText(user)}`}
            subtitle={user.description}
            actions={actionPanel(user)}
          />
        ))}
      </List>
    );
  };

  return sessionStartFailed ? <Error errorMessage={errorMessage} navigationTitle={SearchPeopleTitle} /> : peopleView();
}
