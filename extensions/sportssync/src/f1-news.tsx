import { List } from "@raycast/api";
import sportInfo from "./utils/getSportInfo";
import getArticles from "./utils/getArticles";
import DisplayNews from "./templates/news";

sportInfo.setSportAndLeague("racing", "f1");

const displaySchedule = () => {
  const { articleLoading } = getArticles();

  return (
    <List isLoading={articleLoading} searchBarPlaceholder="Search for an article">
      <DisplayNews />
    </List>
  );
};

export default displaySchedule;
