import { List, Icon, Image, Color } from "@raycast/api";
import { Status } from "../utils/types";
import { statusParser, getTextForVisibility, getIconForVisibility } from "../utils/util";
import { dateTimeFormatter } from "../utils/util";
import StatusAction from "./StatusAction";
interface StatusItemProps {
  status: Status;
}

const StatusItem: React.FC<StatusItemProps> = ({ status }) => {
  const content = status.spoiler_text || status.content;
  const time = dateTimeFormatter(new Date(status.created_at), "short");

  return (
    <List.Item
      title={content.replace(/<.*?>/g, "")}
      icon={{
        source: status.account.avatar,
        mask: Image.Mask.Circle,
      }}
      detail={
        /**
         * @reference https://github.com/raycast/extensions/pull/5001#issuecomment-1466265348
         * @author pernielsentikaer
         */
        <List.Item.Detail
          markdown={statusParser(status, "id")}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Boosts"
                text={String(status.reblogs_count)}
                icon={{
                  source: Icon.Repeat,
                  tintColor: status.reblogged ? Color.Purple : Color.PrimaryText,
                }}
              />
              <List.Item.Detail.Metadata.Label
                title="Favorites"
                text={String(status.favourites_count)}
                icon={{
                  source: Icon.Star,
                  tintColor: status.favourited ? Color.Yellow : Color.PrimaryText,
                }}
              />
              <List.Item.Detail.Metadata.Label title="Replies" text={String(status.replies_count)} icon={Icon.Reply} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Visibility"
                text={getTextForVisibility(status.visibility)}
                icon={getIconForVisibility(status.visibility)}
              />
              <List.Item.Detail.Metadata.Label title="Published Time" text={time} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<StatusAction status={status} />}
    />
  );
};

export default StatusItem;
