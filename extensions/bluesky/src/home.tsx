import { Action, ActionPanel, Color, List, useNavigation } from "@raycast/api";
import { HomeNavigationTitle, SelectActionMessage } from "./utils/constants";

import About from "./components/about/About";
import CreateNewPost from "./create-a-new-post";
import Error from "./components/error/Error";
import { HomeLaunchContext } from "./types/types";
import Onboard from "./components/onboarding/Onboard";
import SearchPeople from "./search-people";
import SignOut from "./components/signOut/SignOut";
import ViewNotifications from "./view-notifications";
import ViewRecentPosts from "./view-my-recent-posts";
import ViewTimeline from "./view-timeline";
import { ViewTypes } from "./config/viewTypeMap";
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

  const onViewSelected = (viewId: string) => {
    switch (parseInt(viewId)) {
      case 1:
        push(<ViewTimeline />);
        break;
      case 2:
        push(<ViewNotifications />);
        break;
      case 3:
        push(<SearchPeople />);
        break;
      case 4:
        push(<CreateNewPost />);
        break;
      case 5:
        push(<ViewRecentPosts />);
        break;
      case 6:
        push(<SignOut />);
        break;
      case 7:
        push(<About previousViewTitle="Home" />);
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
