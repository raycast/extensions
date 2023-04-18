import { LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { MenuBarIconUrl, MenuBarTooltip } from "./utils/constants";

import CustomAction from "./components/actions/CustomAction";

export default function MenuBar() {
  return (
    <MenuBarExtra icon={MenuBarIconUrl} tooltip={MenuBarTooltip}>
      <MenuBarExtra.Section>
        <CustomAction
          menuBarItem={true}
          actionKey="homeView"
          onClick={async () => {
            await launchCommand({ name: "home", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <CustomAction
          menuBarItem={true}
          actionKey="timelineView"
          onClick={async () => {
            await launchCommand({ name: "view-timeline", type: LaunchType.UserInitiated });
          }}
        />
        <CustomAction
          menuBarItem={true}
          actionKey="notificationView"
          onClick={async () => {
            await launchCommand({ name: "view-notifications", type: LaunchType.UserInitiated });
          }}
        />
        <CustomAction
          menuBarItem={true}
          actionKey="searchView"
          onClick={async () => {
            await launchCommand({ name: "search-people", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <CustomAction
          menuBarItem={true}
          actionKey="createPostView"
          onClick={async () => {
            await launchCommand({ name: "create-a-new-post", type: LaunchType.UserInitiated });
          }}
        />
        <CustomAction
          menuBarItem={true}
          actionKey="recentPostsView"
          onClick={async () => {
            await launchCommand({ name: "view-my-recent-posts", type: LaunchType.UserInitiated });
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <CustomAction
          menuBarItem={true}
          actionKey="aboutView"
          onClick={async () => {
            await launchCommand({ name: "home", type: LaunchType.UserInitiated, context: { navigateTo: "About" } });
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
