export const resultsParser: { [key: string]: (json: any) => [] } = {
  KOKO: (json) => {
    return json["items"][0];
  },
  KOEN: (json) => {
    return json["items"][0];
  },
  SIKO: (json) => {
    return json["items"][0];
  },
  SHOPPING: (json) => {
    return json["items"][1].map((element: string[][][]) => element[0]);
  },
  GENERAL: (json) => {
    return json["items"][0];
  },
};

export const descriptionParser: {
  [key: string]: (item: any) => {
    query: string;
    description: string;
  };
} = {
  KOKO: (item) => {
    return { query: item[0][0], description: item[1][0] };
  },
  KOEN: (item) => {
    return { query: item[0][0], description: item[2][0] };
  },
  SIKO: (item) => {
    return { query: item[0][0], description: item[1][0] + ": " + item[3][0] };
  },
  SHOPPING: (item) => {
    return { query: item[0], description: "Search Naver Shopping for '" + item[0] + "'" };
  },
  GENERAL: (item) => {
    return { query: item[0], description: "Search Naver for '" + item[0] + "'" };
  },
};
