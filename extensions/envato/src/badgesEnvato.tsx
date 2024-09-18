import { List, Icon } from "@raycast/api";
import { IBadgesResponse } from "envato";

/*-----------------------------------*/
/*------ BADGES
/*-----------------------------------*/
export function AccountBadges(props: { badges: IBadgesResponse }) {
  return (
    <List.Section>
      <List.Item
        icon={Icon.Star}
        title={"Badges"}
        accessories={props.badges.map((badge) => {
          return { icon: badge.image };
        })}
      />
    </List.Section>
  );
}
