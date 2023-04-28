import { List, Icon, Color } from "@raycast/api";
import { saleItem } from "./types";

/*-----------------------------------*/
/*------ BADGES
/*-----------------------------------*/

export function AccountBadges(props: { badges: any }) {
  return (
    <List.Section>
      <List.Item
        icon={Icon.Star}
        title={"Badges"}
        accessories={props.badges.map((badge, index) => {
          return { icon: badge.image };
        })}
      />
    </List.Section>
  );
}

export function BadgeItem(props: { badge: any; key: number }) {
  const accessories = [
    { text: `${props.item.number_of_sales} Purchases` },
    {
      text: `${props.item.rating.rating} (${props.item.rating.count})`,
      icon: { source: Icon.Star, tintColor: Color.Yellow },
    },
  ];
  return <List.Item icon={"/"} title={String(props.badge.name ?? "")} />;
}
