import { Action, Icon } from "@raycast/api";
import { useAtom } from "jotai";
import { currentComicAtom } from "./atoms";
import { BASE_URL } from "./xkcd";

type Props = {
  comic?: number | string;
};

const OpenComicInBrowser = ({ comic }: Props) => {
  const [currentComic] = useAtom(currentComicAtom);
  const comicId = comic ?? currentComic;
  return <Action.OpenInBrowser icon={Icon.Globe} url={`${BASE_URL}/${comicId}/`} />;
};

export default OpenComicInBrowser;
