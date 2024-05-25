import { MenuBarExtra, environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Configuration } from "./lib/configurations";
import { fetchNotifications } from "./lib/notifications";
import { Notification } from "./lib/notifications";
import { useEffect } from "react";
import { toHtmlUrl } from "./lib/github";
import { execAsync } from "./lib/util";
export default function Command() {
  const [state, setState] = useCachedState<Notification[] | undefined>("notifications", [], { cacheNamespace: `${environment.extensionName}` });
  const [configState] = useCachedState<Configuration[]>("config", [], {
    cacheNamespace: `${environment.extensionName}`,
  });
  useEffect(() => {
    async function update() {
      const n: Notification[] = await fetchNotifications(configState);
      console.log(n.map(n=>n.repository.owner.avatar_url))
      setState(n);
    }
    update();
  }, []);
  return (
    <MenuBarExtra icon="command-icon.png" tooltip="Your Pull Requests">
      <MenuBarExtra.Section title="notifications">
        {state?.map((s) => (
          <MenuBarExtra.Item
            title={s.repository.full_name+"\n"+s.subject.title}
            key={s.id}
            icon={s.repository.owner.avatar_url ?? "command-icon.png"}
            onAction={() => toHtmlUrl(s).then((url) => execAsync(`open ${url}`))}
          >
          </MenuBarExtra.Item>
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}