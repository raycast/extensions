import { List, useNavigation } from "@raycast/api";

import About from "../about/About";
import AccountsView from "../accounts/AccountsView";
import AuthorFeed from "../feed/AuthorFeed";
import Home from "../../home";
import LikeFeed from "../feed/LikeFeed";
import { NavigationViewTooltip } from "../../utils/constants";
import NewPost from "../../new-post";
import Notifications from "../../notifications";
import Privacy from "../privacy/Privacy";
import Timeline from "../../timeline";
import { ViewTypes } from "../../config/viewTypeMap";
import { getSignedInAccountHandle } from "../../libs/atp";

const NavigationDropdown = ({ currentViewId }: { currentViewId: number }) => {
  const { push } = useNavigation();

  const onViewChanged = async (viewId: string) => {
    const handle = await getSignedInAccountHandle();
    switch (parseInt(viewId)) {
      case 0:
        push(<Home />);
        break;
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
        push(<Privacy />);
        break;
      case 8:
        push(<About />);
        break;
      default:
        break;
    }
  };

  const getSectionIds = () => {
    return [...new Set(ViewTypes.map((viewType) => viewType.navbarSectionId))];
  };

  const getViewsForSection = (sectionId: string) => {
    return ViewTypes.filter((view) => !view.hideInNavView && view.navbarSectionId === sectionId);
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
