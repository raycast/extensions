import { Icon, List } from "@raycast/api";
import { Member } from "@useshortcut/client";

export default function getOwnersAccessoryItems(owners: (Member | undefined)[]) {
  return [
    ...owners.filter(Boolean).map(
      (owner) =>
        ({
          icon: {
            source: `https://www.gravatar.com/avatar/${owner?.profile?.gravatar_hash}`,
          },
          tooltip: owner?.profile?.name,
        } as List.Item.Accessory)
    ),

    owners.length === 0 &&
      ({
        icon: Icon.Person,
        tooltip: "No owners",
      } as List.Item.Accessory),
  ].filter(Boolean);
}
