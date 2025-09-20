import { Action, ActionPanel, Icon, List, showToast, Toast, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { withAuthorization } from "./shared/withAuthorization";
import { MattermostClient } from "./shared/MattermostClient";
import { UserProfileStatusKind } from "./shared/MattermostTypes";

/////////////////////////////////////////
//////////////// Types //////////////////
/////////////////////////////////////////

interface UserProfileStatusKindUI {
  title: string;
  icon: Image.ImageLike;
  model: UserProfileStatusKind;
}

function modelToUI(model: UserProfileStatusKind): UserProfileStatusKindUI {
  let title = "";
  let icon: Image.ImageLike = "";

  switch (model) {
    case "away":
      title = "Away";
      icon = "🏃";
      break;
    case "dnd":
      title = "Do not disturb";
      icon = "⛔️";
      break;
    case "offline":
      title = "Offline";
      icon = "🔘";
      break;
    case "online":
      title = "Online";
      icon = "mattermost-online.png";
      break;
  }

  return {
    title: title,
    icon: icon,
    model: model,
  };
}

interface State {
  user_id: string;
  current: UserProfileStatusKindUI;
  availableKinds: UserProfileStatusKindUI[];
}

const availableKinds: UserProfileStatusKind[] = ["online", "away", "offline", "dnd"];

/////////////////////////////////////////
/////////////// Command /////////////////
/////////////////////////////////////////

export default function Command() {
  return withAuthorization(<StatusesList />);
}

function StatusesList() {
  const [state, setState] = useState<State | undefined>();

  useEffect(() => {
    (async () => {
      const profileStatus = await MattermostClient.getProfileStatus();

      setState({
        user_id: profileStatus.user_id,
        current: modelToUI(profileStatus.status),
        availableKinds: availableKinds.filter((kind) => kind !== profileStatus.status).map(modelToUI),
      });
    })();
  }, []);

  return (
    <List isLoading={state == undefined}>
      <List.Section key="currentSection" title="Current Status">
        {state?.current && <List.Item key="current" title={state.current.title} icon={state.current.icon} />}
      </List.Section>

      <List.Section key="availableStatuses" title="Available statuses">
        {state?.availableKinds &&
          state?.availableKinds.map((kind, index) => (
            <List.Item
              key={kind.model}
              title={kind.title}
              icon={kind.icon}
              accessories={[{ icon: keyNumberEmojiMap.get(index + 2) }]}
              actions={
                <ActionPanel>
                  <Action
                    key="set status"
                    title="Set Status"
                    icon={Icon.Pencil}
                    onAction={async () => {
                      console.log(kind);
                      try {
                        showToast(Toast.Style.Animated, "Setting status...");
                        await MattermostClient.setProfileStatus(state.user_id, kind.model);
                        setState({
                          user_id: state.user_id,
                          current: kind,
                          availableKinds: availableKinds.filter((other) => other !== kind.model).map(modelToUI),
                        });
                        showToast(Toast.Style.Success, "Success set status");
                      } catch (error) {
                        console.error(error);
                        showToast(Toast.Style.Failure, `Fail ${error}`);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
const keyNumberEmojiMap = new Map<number, string>([
  [1, "1️⃣"],
  [2, "2️⃣"],
  [3, "3️⃣"],
  [4, "4️⃣"],
  [5, "5️⃣"],
  [6, "6️⃣"],
  [7, "7️⃣"],
  [8, "8️⃣"],
  [9, "9️⃣"],
  [10, "🔟"],
]);
