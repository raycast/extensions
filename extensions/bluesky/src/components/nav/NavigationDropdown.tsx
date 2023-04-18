import { List, useNavigation } from "@raycast/api";

import About from "../about/About";
import CreateNewPost from "../../create-a-new-post";
import Home from "../../home";
import { NavigationViewTooltip } from "../../utils/constants";
import SearchPeople from "../../search-people";
import SignOut from "../signOut/SignOut";
import ViewNotifications from "../../view-notifications";
import ViewRecentPosts from "../../view-my-recent-posts";
import ViewTimeline from "../../view-timeline";
import { ViewTypes } from "../../config/viewTypeMap";

const NavigationDropdown = ({ currentViewId }: { currentViewId: number }) => {
  const { push } = useNavigation();

  const onViewChanged = (viewId: string) => {
    switch (parseInt(viewId)) {
      case 0:
        push(<Home />);
        break;
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
        push(<About />);
        break;
      default:
        break;
    }
  };

  const getSectionIds = () => {
    return [...new Set(ViewTypes.map((viewType) => viewType.sectionId))];
  };

  const getViewsForSection = (sectionId: string) => {
    return ViewTypes.filter((viewType) => viewType.sectionId === sectionId);
  };

  return (
    <List.Dropdown tooltip={NavigationViewTooltip} value={currentViewId.toString()} onChange={onViewChanged}>
      {getSectionIds().map((sectionId) => (
        <List.Dropdown.Section key={sectionId.toString()}>
          {getViewsForSection(sectionId).map((viewType) => (
            <List.Dropdown.Item
              key={viewType.id.toString()}
              title={viewType.getName()}
              value={viewType.id.toString()}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
};

<List.Dropdown.Section>
  {ViewTypes.map((viewType) => (
    <List.Dropdown.Item key={viewType.id} title={viewType.getName()} value={viewType.id} />
  ))}
</List.Dropdown.Section>;

export default NavigationDropdown;
