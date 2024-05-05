import { Action, ActionPanel, List, environment } from "@raycast/api";
import { Notification, fetchNotifications } from "../lib/notifications";
import { useEffect, useState } from "react";
import { hashColorizer } from "../util";
import { Configuration } from "../lib/configurations";
import { useCachedState } from "@raycast/utils";
import { execAsync } from "../lib/util";
import { toHtmlUrl } from "../lib/github";
export default function NotificationsView() {
  const [state, setState] = useState<Notification[] | undefined>([]);
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
      {state?.map((s) => (
        <List.Item
          title={s.subject.title}
          keywords={[s.subject.title, s.subject.type, s.reason, s.repository.full_name]}
          key={s.id}
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
              <Action title="Open" onAction={() => toHtmlUrl(s).then((url) => execAsync(`open ${url}`))} />
            </ActionPanel>
          }
        ></List.Item>
      ))}
    </List>
  );
}
