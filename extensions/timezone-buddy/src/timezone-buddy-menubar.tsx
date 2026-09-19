import { Icon, LocalStorage, MenuBarExtra, Image, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCurrentTimeForTz } from "./helpers/getCurrentTimeForTz";
import { getCurrentDateForTz } from "./helpers/getCurrentDateForTz";
import { getTooltipForTz } from "./helpers/getTooltipForTz";
import { getHourStatus } from "./helpers/getHourStatus";
import { TimezoneBuddy } from "./interfaces/TimezoneBuddy";

export default function Command() {
  const [buddies, setBuddies] = useState<TimezoneBuddy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getBuddies() {
      const buddies = await LocalStorage.getItem<string>("buddies");

      if (buddies) {
        setBuddies(JSON.parse(buddies));
      }

      setLoading(false);
    }

    getBuddies();
  }, []);

  function openMainCommand() {
    launchCommand({ name: "timezone-buddy", type: LaunchType.UserInitiated }).catch(() => {
      // The main command may be disabled; ignore the launch failure.
    });
  }

  return (
    <MenuBarExtra icon={Icon.TwoPeople} tooltip="Your buddies" isLoading={loading}>
      {!buddies.length && (
        <MenuBarExtra.Item title="No buddies added" icon={Icon.RemovePerson} onAction={openMainCommand} />
      )}
      {buddies.map((buddy, index) => {
        const status = getHourStatus(buddy.tz);
        return (
          <MenuBarExtra.Item
            key={index}
            title={`${status.block} ${buddy.name}`}
            subtitle={`  ${getCurrentTimeForTz(buddy.tz)} · ${getCurrentDateForTz(buddy.tz)}`}
            icon={{ source: buddy.avatar, mask: Image.Mask.Circle }}
            tooltip={getTooltipForTz(buddy.tz)}
            onAction={openMainCommand}
          />
        );
      })}
      {buddies.length > 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Manage Buddies…" icon={Icon.Cog} onAction={openMainCommand} />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
