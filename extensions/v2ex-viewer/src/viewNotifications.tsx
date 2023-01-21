import { List, Icon } from "@raycast/api";
import { getUnixFromNow } from "./utils/time";
import { useNotifications } from "./api/hooks";

const getTopicTitle = (text: string) => {
  const regex = /<a href="\/t\/.*>(?<topicTitle>.*)<\/a>/gm;
  const match = regex.exec(text);
  try {
    return match?.groups?.topicTitle;
  } catch (error) {
    return text;
  }
};
export default function Command() {
  const { notifications, previousLatestId } = useNotifications();

  return (
    <List isShowingDetail>
      {notifications.map(({ created, id, text, member, payload }) => {
        const accessories = [
          { text: getUnixFromNow(created) },
          {
            icon: id > previousLatestId ? Icon.Dot : null,
          },
        ];
        return (
          <List.Section title={getTopicTitle(text)}>
            <List.Item
              icon={text.includes("›") ? Icon.Heart : Icon.Message}
              title={member.username}
              accessories={accessories}
              detail={<List.Item.Detail markdown={payload} />}
            />
          </List.Section>
        );
      })}
    </List>
  );
}
