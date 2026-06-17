import { usePromise } from "@raycast/utils";
import { Feed, Tags } from "../type";
import fetch from "cross-fetch";
import { Svgs } from "../ui/svg";

/**
 * New
 * step=0&sort=new&tags=&timeframe=30
 * popular Month
 * step=0&sort=popular&tags=&timeframe=30
 * popular Year
 * step=0&sort=popular&tags=&timeframe=365
 * popular All
 * step=0&sort=popular&tags=&timeframe=4000
 * random
 * step=0&sort=random&tags=&timeframe=30
 *
 * tags
 * step=0&tags=vintage&timeframe=30
 * step=0&tags=vintage-mint&timeframe=30
 *
 */
export default function (sort: string, tags: Tags) {
  let timeframe = 30;
  if (sort.startsWith("popular")) {
    if (sort === "popular-month") {
      timeframe = 30;
    } else if (sort === "popular-year") {
      timeframe = 365;
    } else if (sort === "popular-all") {
      timeframe = 4000;
    }
    sort = "popular";
  }

  return usePromise(
    (sort, tags, timeframe) => async (options: { page: number }) => {
      // console.log("fetching", options.page, sort, tags, timeframe);
      if (sort === "favorite") {
        return {
          data: [],
          hasMore: false,
        };
      }

      const tagsData = [...tags.colors, ...tags.collections].join("-");
      const feeds = await fetch("https://colorhunt.co/php/feed.php", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: `step=${options.page}&tags=${tagsData}&timeframe=${timeframe}&sort=${sort}`,
      }).then((res) => res.json() as unknown as Feed[]);

      const svgs: string[] = [];
      const generator = Svgs.default();
      for (const feed of feeds) {
        svgs.push((await generator(feed.code, true)) || "");
      }

      return {
        data: feeds.map((item, index) => ({
          data: item,
          svg: svgs[index],
        })),
        hasMore: feeds.length > 0,
      };
    },
    [sort, tags, timeframe],
  );
}
