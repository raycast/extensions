import { List, Detail, Icon } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import { ActivityData } from "./utils/types";
import { dateIcon } from "./utils/helpers";

interface activityData {
  activities: ActivityData[];
}

export default function Activities(props: { spaceId: number }) {
  const data = sbData<activityData>(`spaces/${props.spaceId}/activities/`);
  if (data.isLoading) {
    return <Detail markdown={`Loading Activities for space ${props.spaceId}...`} />;
  } else if (data.isLoading === false && !data.data) {
    return (
      <List>
        <List.EmptyView icon={Icon.Tray} title="No Activities found." />
      </List>
    );
  } else {
    return (
      <List isLoading={data.isLoading}>
        {data.data?.activities.map((item: ActivityData) => (
          <List.Item
            key={item.activity.id}
            title={item.trackable.name}
            subtitle={item.activity.key}
            accessories={[
              {
                date: new Date(item.activity.updated_at),
                icon: dateIcon(new Date(item.activity.updated_at)),
                tooltip: "Updated at:",
              },
              { text: { value: `${item.user.friendly_name}` } },
            ]}
          />
        ))}
      </List>
    );
  }
}
