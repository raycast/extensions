import { Icon, Image } from "@raycast/api";
import { RSSItem } from "./rss";
export const getItemIcon = (item: RSSItem): Image => {
  if (item.categories?.includes("politiek")) {
    return { source: Icon.Person };
  }
  if (["sport", "sport-overig", "darts"].some((c) => item.categories?.includes(c))) {
    return { source: Icon.Racket };
  }
  if (item.categories?.includes("tech")) {
    return { source: Icon.ComputerChip };
  }
  if (item.categories?.includes("economie")) {
    return { source: Icon.BankNote };
  }
  if (item.categories?.includes("binnenland")) {
    return { source: Icon.House };
  }
  if (item.categories?.includes("voetbal")) {
    return { source: Icon.SoccerBall };
  }
  if (item.categories?.includes("buitenland")) {
    return { source: Icon.Airplane };
  }
  if (["wetenschap", "tech-wetenschap"].some((c) => item.categories?.includes(c))) {
    return { source: Icon.LightBulb };
  }
  if (item.categories?.includes("klimaat")) {
    return { source: Icon.CloudRain };
  }
  if (item.categories?.includes("videos")) {
    return { source: Icon.Video };
  }
  if (item.categories?.includes("achterklap")) {
    return { source: Icon.Emoji };
  }
  if (item.categories?.includes("nujij")) {
    return { source: Icon.PersonCircle };
  }
  if (item.categories?.includes("muziek")) {
    return { source: Icon.Music };
  }
  if (item.categories?.includes("formule-1")) {
    return { source: Icon.Car };
  }

  return { source: Icon.Globe };
};
