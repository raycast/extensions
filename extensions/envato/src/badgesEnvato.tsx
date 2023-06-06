import { List, Icon } from "@raycast/api";

/*-----------------------------------*/
/*------ BADGES
/*-----------------------------------*/
export function AccountBadges(props: { badges: any }) {
  return (
    <List.Section>
      <List.Item
        icon={Icon.Star}
        title={"Badges"}
        accessories={props.badges.map((badge: any) => {
          return { icon: badge.image };
        })}
      />
    </List.Section>
  );
}
