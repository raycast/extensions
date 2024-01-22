export type Page = {
  title: string;
  url: string;
};

export type NoroffApiIndex = {
  [key: string]: Page[];
};

const noroffApiIndex: NoroffApiIndex = {
  Introduction: [
    {
      title: "Introduction",
      url: "https://docs.noroff.dev/",
    },
  ],
  About: [
    {
      title: "About",
      url: "https://docs.noroff.dev/about",
    },
  ],
  Authentication: [
    {
      title: "Authentication",
      url: "https://docs.noroff.dev/authentication",
    },
  ],
  "Pagination & Sorting": [
    {
      title: "Pagination & Sorting",
      url: "https://docs.noroff.dev/pagination-sorting",
    },
  ],
  "Basic Endpoints": [
    {
      title: "Authentication",
      url: "https://docs.noroff.dev/basic-endpoints/authentication",
    },
    {
      title: "Books",
      url: "https://docs.noroff.dev/basic-endpoints/books",
    },
    {
      title: "Cat Facts",
      url: "https://docs.noroff.dev/basic-endpoints/cat-facts",
    },
    {
      title: "Jokes",
      url: "https://docs.noroff.dev/basic-endpoints/jokes",
    },
    {
      title: "NBA Teams",
      url: "https://docs.noroff.dev/basic-endpoints/nba-teams",
    },
    {
      title: "Old Games",
      url: "https://docs.noroff.dev/basic-endpoints/old-games",
    },
    {
      title: "Quotes",
      url: "https://docs.noroff.dev/basic-endpoints/quotes",
    },
    {
      title: "Online Shop",
      url: "https://docs.noroff.dev/basic-endpoints/online-shop",
    },
  ],
  "E-commerce Endpoints": [
    {
      title: "Rainy Days",
      url: "https://docs.noroff.dev/ecom-endpoints/rainy-days",
    },
    {
      title: "Square Eyes",
      url: "https://docs.noroff.dev/ecom-endpoints/square-eyes",
    },
    {
      title: "GameHub",
      url: "https://docs.noroff.dev/ecom-endpoints/gamehub",
    },
  ],
  "Social Endpoints": [
    {
      title: "Authentication",
      url: "https://docs.noroff.dev/social-endpoints/authentication",
    },
    {
      title: "Posts",
      url: "https://docs.noroff.dev/social-endpoints/posts",
    },
    {
      title: "Profiles",
      url: "https://docs.noroff.dev/social-endpoints/profiles",
    },
  ],
  "Auction House Endpoints": [
    {
      title: "Authentication",
      url: "https://docs.noroff.dev/auctionhouse-endpoints/authentication",
    },
    {
      title: "Listings",
      url: "https://docs.noroff.dev/auctionhouse-endpoints/listings",
    },
    {
      title: "Profiles",
      url: "https://docs.noroff.dev/auctionhouse-endpoints/profiles",
    },
  ],
  "Holidaze Endpoints": [
    {
      title: "Authentication",
      url: "https://docs.noroff.dev/holidaze/authentication",
    },
    {
      title: "Profiles",
      url: "https://docs.noroff.dev/holidaze/profiles",
    },
    {
      title: "Bookings",
      url: "https://docs.noroff.dev/holidaze/bookings",
    },
    {
      title: "Venues",
      url: "https://docs.noroff.dev/holidaze/venues",
    },
  ],
};

export default noroffApiIndex;
