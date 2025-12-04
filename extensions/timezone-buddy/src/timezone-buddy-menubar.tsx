import { Icon, LocalStorage, MenuBarExtra, Image } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCurrentTimeForTz } from "./helpers/getCurrentTimeForTz";
import { getTooltipForTz } from "./helpers/getTooltipForTz";
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

  return (
    <MenuBarExtra icon={Icon.TwoPeople} tooltip="Your buddies" isLoading={loading}>
      {!buddies.length && <MenuBarExtra.Item title="No buddies added" icon={Icon.RemovePerson} onAction={() => {}} />}
      {buddies &&
        buddies.map((buddy, index) => (
          <MenuBarExtra.Item
            key={index}
            title={buddy.name}
            subtitle={getCurrentTimeForTz(buddy.tz)}
            icon={{ source: buddy.avatar, mask: Image.Mask.Circle }}
            tooltip={getTooltipForTz(buddy.tz)}
            onAction={() => {}}
          />
        ))}
    </MenuBarExtra>
  );
}
