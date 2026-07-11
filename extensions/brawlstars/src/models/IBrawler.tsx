interface IBrawlers {
  id: number;
  avatarId: number;
  name: string;
  hash: string;
  path: string;
  released: boolean;
  version: number;
  link: string;
  imageUrl: string;
  imageUrl2: string;
  imageUrl3: string;
  class: {
    id: number;
    name: string;
  };
  rarity: {
    id: number;
    name: string;
    color: string;
  };
  description: string;
  starPowers: {
    id: number;
    name: string;
    path: string;
    version: number;
    description: string;
    descriptionHtml: string;
    imageUrl: string;
    realeased: boolean;
  }[];

  gadgets: {
    id: number;
    name: string;
    path: string;
    version: number;
    description: string;
    descriptionHtml: string;
    imageUrl: string;
    realeased: boolean;
  }[];
}

export const emptyListBrawlersData: IBrawlers[] = [
  {
    id: 0,
    avatarId: 0,
    name: "",
    hash: "",
    path: "",
    released: false,
    version: 0,
    link: "",
    imageUrl: "",
    imageUrl2: "",
    imageUrl3: "",
    class: {
      id: 0,
      name: "",
    },
    rarity: {
      id: 0,
      name: "",
      color: "",
    },
    description: "",
    starPowers: [
      {
        id: 0,
        name: "",
        path: "",
        version: 0,
        description: "",
        descriptionHtml: "",
        imageUrl: "",
        realeased: false,
      },
    ],
    gadgets: [
      {
        id: 0,
        name: "",
        path: "",
        version: 0,
        description: "",
        descriptionHtml: "",
        imageUrl: "",
        realeased: false,
      },
    ],
  },
];

export default IBrawlers;
