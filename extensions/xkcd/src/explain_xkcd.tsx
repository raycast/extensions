import { Action, Icon } from "@raycast/api";
import { useAtom } from "jotai";
import { currentComicAtom } from "./atoms";

const ExplainXkcd = () => {
  const [currentComic] = useAtom(currentComicAtom);
  return (
    <Action.OpenInBrowser
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      icon={Icon.QuestionMark}
      title={"Open in Explain xkcd"}
      url={`https://www.explainxkcd.com/wiki/index.php/${currentComic}`}
    />
  );
};

export default ExplainXkcd;
