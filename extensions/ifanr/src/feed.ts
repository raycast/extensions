import Parser from "rss-parser";

const parser = new Parser<IFeed, IFeedItem>();

const RSS = "https://www.ifanr.com/feed";

export async function feed() {
  const feed = await parser.parseURL(RSS);
  return parse(feed);
}

function parse(feed: IFeed): IList {
  const list: IList = [];

  feed.items.map((item) => {
    list.push({
      title: item.title,
      url: item.link,
      author: item.creator,
    });
  });

  return list;
}
