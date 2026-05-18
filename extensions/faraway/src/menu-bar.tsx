import { Clipboard, Icon, Image, MenuBarExtra, Toast, launchCommand, LaunchType, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listFriends } from "./lib/storage";
import { formatTimeInTz, isNightInTz, minutesSinceMidnight } from "./lib/time";
import { t } from "./lib/i18n";

export default function MenuBarCommand() {
  const { data, isLoading } = useCachedPromise(listFriends, [], { initialData: [] });
  const friends = [...(data ?? [])].sort((a, b) => minutesSinceMidnight(a.timezone) - minutesSinceMidnight(b.timezone));

  // Show name + time in the menu bar only when there is a single friend;
  // with multiple friends the bar would get crowded, so just show the icon.
  const menuBarTitle = friends.length === 1 ? `${friends[0].name} ${formatTimeInTz(friends[0].timezone)}` : undefined;

  return (
    <MenuBarExtra icon={Icon.TwoPeople} title={menuBarTitle} isLoading={isLoading}>
      {friends.length === 0 ? (
        <MenuBarExtra.Item
          title={t("noFriendsTitle")}
          onAction={() => launchCommand({ name: "add-friend", type: LaunchType.UserInitiated })}
        />
      ) : (
        friends.map((f) => {
          const time = formatTimeInTz(f.timezone);
          const night = isNightInTz(f.timezone);
          const subtitle = night ? `🌙  ${time}` : time;
          const icon = f.avatarPath
            ? { source: f.avatarPath, mask: Image.Mask.Circle }
            : { source: Icon.Person, mask: Image.Mask.Circle };
          return (
            <MenuBarExtra.Item
              key={f.id}
              icon={icon}
              title={f.name}
              subtitle={subtitle}
              tooltip={`${f.cityLabel} · ${time}${night ? " 🌙" : ""}`}
              onAction={async () => {
                const text = `${f.name} — ${time} (${f.cityLabel})`;
                await Clipboard.copy(text);
                await showToast({ style: Toast.Style.Success, title: "Copied", message: text });
              }}
            />
          );
        })
      )}
    </MenuBarExtra>
  );
}
