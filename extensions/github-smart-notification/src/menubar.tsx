import { MenuBarExtra, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Configuration } from "./lib/configurations";
import { fetchNotifications } from "./lib/notifications";
import { Notification } from "./lib/notifications";
import { useEffect } from "react";
import { toHtmlUrl } from "./lib/github";
import { execAsync } from "./lib/util";
export default function Command() {
  const [state, setState] = useCachedState<Notification[] | undefined>("notifications", undefined, {
    cacheNamespace: `${environment.extensionName}`,
  });
  const [configState] = useCachedState<Configuration[]>("config", [], {
    cacheNamespace: `${environment.extensionName}`,
  });
  useEffect(() => {
    async function update() {
      const n: Notification[] = await fetchNotifications(configState);
      setState(n);
    }
    update();
  }, []);
  return (
    <MenuBarExtra icon="command-icon.png" tooltip="Your Pull Requests" isLoading={state === undefined}>
      <MenuBarExtra.Section title={state !== undefined ? "notifications" : "notifications loading"}>
        {state?.map((s) => (
          <MenuBarExtra.Item
            title={s.repository.full_name + "\n" + s.subject.title}
            subtitle={s.subject.type + "/" + s.reason}
            key={s.id}
            icon={s.repository.owner.avatar_url ?? "command-icon.png"}
            onAction={() => toHtmlUrl(s).then((url) => execAsync(`open ${url}`))}
          ></MenuBarExtra.Item>
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
