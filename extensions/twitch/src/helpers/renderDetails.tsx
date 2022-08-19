import dedent from "dedent-js";
import Item from "../interfaces/FollowingItem";

const NL = "  \n";

export const renderDetails = (item: Item) => {
  return dedent(`
    <img alt="Twitch Thumbnail" src="${item.thumbnail_url
      .replace("{width}", "512")
      .replace("{height}", "288")}" height="288" />

    ${item.title}
    `)
    .split("\n")
    .join(NL);
};
