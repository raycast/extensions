import Parser from "rss-parser";

const parser = new Parser<IFeed, IFeedItem>();

const END_POINTER = "https://www.ifanr.com/feed";

export async function feed() {
  const feed = await parser.parseURL(END_POINTER);
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
