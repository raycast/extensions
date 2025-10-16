import { Action, Icon } from "@raycast/api";
import { useAtom } from "jotai";
import { currentComicAtom } from "./atoms";
import { BASE_URL } from "./xkcd";

const OpenComicInBrowser = () => {
  const [currentComic] = useAtom(currentComicAtom);
  return <Action.OpenInBrowser icon={Icon.Globe} url={`${BASE_URL}/${currentComic}/`} />;
};

export default OpenComicInBrowser;
