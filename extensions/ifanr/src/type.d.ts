interface IFeed {
  items: IFeedItem[];
}

interface IFeedItem {
  title: string;
  link: string;
  creator: string;
}

type IList = IListItem[];

interface IListItem {
  title: string;
  url: string;
  author: string;
}
