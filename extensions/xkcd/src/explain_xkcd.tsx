import { Action, Icon } from "@raycast/api";
import { useAtom } from "jotai";
import { currentComicAtom } from "./atoms";

type Props = {
  comic?: number | string;
};

const ExplainXkcd = ({ comic }: Props) => {
  const [currentComic] = useAtom(currentComicAtom);
  const comicId = comic ?? currentComic;
  return (
    <Action.OpenInBrowser
      shortcut={{ modifiers: ["cmd"], key: "e" }}
      icon={Icon.QuestionMark}
      title={"Open in Explain xkcd"}
      url={`https://www.explainxkcd.com/wiki/index.php/${comicId}`}
    />
  );
};

export default ExplainXkcd;
