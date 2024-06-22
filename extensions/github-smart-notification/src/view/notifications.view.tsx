import { Action, ActionPanel, Keyboard, List, environment } from "@raycast/api";
import { Notification, fetchNotifications, markAsRead } from "../lib/notifications";
import { useEffect } from "react";
import { hashColorizer } from "../util";
import { Configuration } from "../lib/configurations";
import { useCachedState } from "@raycast/utils";
import { execAsync } from "../lib/util";
import { toHtmlUrl } from "../lib/github";
export default function NotificationsView() {
  const [state, setState] = useCachedState<Notification[] | undefined>("notifications", [], {
    cacheNamespace: `${environment.extensionName}`,
  });
  const [configState] = useCachedState<Configuration[]>("config", [], {
    cacheNamespace: `${environment.extensionName}`,
  });
  useEffect(() => {
    async function update() {
      setState(await fetchNotifications(configState));
    }
    update();
  }, []);
  return (
    <List>
      {state?.map((s, idx) => (
        <List.Item
          title={s.subject.title}
          keywords={[s.subject.title, s.subject.type, s.reason, s.repository.full_name]}
          key={s.id}
          icon={s.repository.owner.avatar_url ?? "command-icon.png"}
          accessories={[
            {
              tag: {
                color: hashColorizer(s.subject.type),
                value: s.subject.type,
              },
              tooltip: "subject",
            },
            {
              tag: {
                color: hashColorizer(s.reason),
                value: s.reason,
              },
              tooltip: "reason",
            },
            {
              tag: {
                color: hashColorizer(s.repository.full_name),
                value: s.repository.full_name,
              },
              tooltip: "repository_name",
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open"
                onAction={() => toHtmlUrl(s).then((url) => execAsync(`open ${url}`))}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
              <Action
                title="Mark as Read"
                onAction={() =>
                  markAsRead(s).then(() => {
                    // update notifications state
                    setState(state.filter((ele, i) => i !== idx));
                  })
                }
                shortcut={Keyboard.Shortcut.Common.Remove}
              ></Action>
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
