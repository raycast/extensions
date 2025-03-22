// export enum Topic {
//   Active = "active",
//   AskHN = "ask",
//   Best = "best",
//   BestComments = "bestcomments",
//   Classic = "classic",
//   FrontPage = "frontpage",
//   Invited = "invited",
//   Jobs = "jobs",
//   Launches = "launches",
//   NewComments = "newcomments",
//   Newest = "newest",
//   Polls = "polls",
//   Pool = "pool",
//   ShowHN = "show",
//   WhoIsHiring = "whoishiring",
// }

// export type EndOfLifeProduct = {
//     name: string;
//     age: number;
// };

interface EndOfLifeProductDetails {
  cycle: string; // this is the only constant property always defined
  [key: string]: string | boolean | number;
}

interface EndOfLifeProductDetailsCache {
  timestamp: number;
  cycles: EndOfLifeProductDetails[];
}

interface EndOfLifeProductsCache {
  timestamp: number;
  products: string[];
}

export type { EndOfLifeProductDetails, EndOfLifeProductDetailsCache, EndOfLifeProductsCache };
