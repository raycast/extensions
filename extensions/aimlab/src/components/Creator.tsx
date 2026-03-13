import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Author } from "../types/author.types";
import generateCreatorAccessories from "../utils/generateCreatorAccessories";
import UserProfile from "../views/profile";

type PropTypes = {
  author: Author;
  index: number;
};

const rankColors = [Color.Yellow, Color.SecondaryText, Color.Orange];

const AuthorComponent = ({ author, index }: PropTypes) => {
  const rank = index + 1;

  return (
    <List.Item
      icon={
        rank <= 3
          ? {
              value: { source: Icon.Crown, tintColor: rankColors[rank - 1] },
              tooltip: "Rank: " + rank,
            }
          : {
              value: { source: Icon.Dot },
              tooltip: "Rank: " + rank,
            }
      }
      title={author.username}
      subtitle={{ value: "#" + rank, tooltip: "Rank" }}
      accessories={generateCreatorAccessories(author)}
      keywords={[author.username]}
      actions={
        <ActionPanel title="Top Creator Actions">
          <Action.Push
            title="Show Player Details"
            icon={Icon.ArrowRight}
            target={<UserProfile username={author.username} />}
          />
          <Action.OpenInBrowser
            title="View Player on Aimlab"
            url={"https://aimlab.gg/u/" + encodeURIComponent(author.username)}
          />
        </ActionPanel>
      }
    />
  );
};

export default AuthorComponent;
