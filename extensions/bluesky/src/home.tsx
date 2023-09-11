import { Action, ActionPanel, Color, List, useNavigation } from "@raycast/api";
import { HomeNavigationTitle, SelectActionMessage } from "./utils/constants";

import About from "./components/about/About";
import AccountsView from "./components/accounts/AccountsView";
import AuthorFeed from "./components/feed/AuthorFeed";
import Error from "./components/error/Error";
import { HomeLaunchContext } from "./types/types";
import LikeFeed from "./components/feed/LikeFeed";
import NewPost from "./new-post";
import Notifications from "./notifications";
import Onboard from "./components/onboarding/Onboard";
import Privacy from "./components/privacy/Privacy";
import Timeline from "./timeline";
import { ViewTypes } from "./config/viewTypeMap";
import { getSignedInAccountHandle } from "./libs/atp";
import { useEffect } from "react";
import useStartATSession from "./hooks/useStartATSession";

interface HomeProps {
  launchContext?: HomeLaunchContext;
}

const Home = ({ launchContext }: HomeProps) => {
  const { push } = useNavigation();
  const [, sessionStartFailed, errorMessage] = useStartATSession(() => push(<Onboard />));

  useEffect(() => {
    if (launchContext?.navigateTo === "About") {
      push(<About />);
    }
  }, []);

  const onViewSelected = async (viewId: string) => {
    const handle = await getSignedInAccountHandle();
    switch (parseInt(viewId)) {
      case 1:
        push(<Timeline />);
        break;
      case 2:
        push(<Notifications />);
        break;
      case 3:
        push(<AccountsView />);
        break;
      case 4:
        push(<NewPost />);
        break;
      case 5:
        if (handle) {
          push(<AuthorFeed showNavDropdown={true} authorHandle={handle} />);
        }
        break;
      case 6:
        if (handle) {
          push(<LikeFeed showNavDropdown={true} authorHandle={handle} />);
        }
        break;
      case 7:
        if (handle) {
          push(<Privacy />);
        }
        break;
      case 8:
        push(<About />);
        break;
    }
  };

  return sessionStartFailed ? (
    <Error errorMessage={errorMessage} navigationTitle={HomeNavigationTitle} />
  ) : (
    <List isShowingDetail={true}>
      {ViewTypes.filter((view) => !view.hideInHomeView).map((view) => {
        return (
          <List.Item
            key={view.id.toString()}
            id={view.id.toString()}
            title={view.getName()}
            icon={{ source: view.icon, tintColor: Color.Blue }}
            detail={<List.Item.Detail markdown={view.description} />}
            actions={
              <ActionPanel>
                <Action title={SelectActionMessage} onAction={() => onViewSelected(view.id)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default Home;
