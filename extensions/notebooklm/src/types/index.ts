import { Color, Icon, getPreferenceValues } from "@raycast/api";

export const Browser = getPreferenceValues().browser.name as keyof typeof BrowserList;

export const BrowserList = {
  Arc: "https://arc.net/",
};

export type Notebook = {
  title: string;
  sources: Source[];
  id: string;
  icon: string;
  owned: Ownership;
  shared: boolean;
  created_at: string;
};

export enum Ownership {
  Owner = 1,
  Editor = 2,
  Viewer = 3,
}

export type Source = {
  id: string;
  title: string;
  metadata: Metadata;
  summary?: Summary;
  status: SourceStatus;
};

export type Metadata = {
  gdoc_id: string[] | null;
  word_count: number | null;
  create_time: string;
  complete_info: {
    id: string;
    complete_time: string;
  } | null;
  source_type: SourceType;
  youtube_info?: YoutubeInfo | null;
  site_url?: string[] | null;
  icon?: {
    source: string | Icon;
    tintColor?: Color;
  };
};

export type YoutubeInfo = {
  url?: string;
  videoId?: string;
  channelName?: string;
};

export type TimestampTuple = [timestamp: number, nanoseconds: number];

export type MetadataArray = [
  string[] | null, // gdoc_id (index 0)
  number | null, // word_count (index 1)
  TimestampTuple, // create_time (index 2)
  [string, TimestampTuple] | null, // complete_info (index 3)
  SourceType, // source_type (index 4)
  [string, string, string] | null | undefined, // youtube_info (index 5, optional): [url, videoId, channelName]
  unknown | undefined, // index 6, optional
  string[] | undefined, // site_url (index 7, optional)
];

export type Summary = {
  id: string;
  topics: string[];
  summary: string[];
  recommended_questions: string[];
};

export enum SourceType {
  Google_Docs = 1,
  Google_Slides = 2,
  PDF = 3,
  Pasted_text = 4,
  Site = 5,
  Markdown = 8,
  YouTube = 9,
  Audio = 10,
}

export enum SourceStatus {
  Loading_0 = 1,
  Success = 2,
  Upload_Prevented = 3,
  Loading_1 = 5,
}

export interface NotebookLMTab {
  id: string;
  tokens?: Tokens;
}

export interface Tokens {
  at: string;
  bl: string;
}

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  location?: string;
}

export interface TabList {
  currentTab?: TabInfo;
  others: TabInfo[];
}

type RPCArg = unknown[];
export type RPCArgs = RPCArg[];

// Response types for transformNotebook
export type NotebookResponse = [
  [string, string, string], // ["wrb.fr", rpcId, JSON string containing notebooks data]
];

export type NotebooksData = [
  Array<
    [
      string, // title (index 0)
      Array<SourceData> | null, // sources (index 1)
      string, // id (index 2)
      string, // icon (index 3)
      unknown, // index 4
      [
        Ownership, // owned status (index 5[0])
        boolean, // shared status (index 5[1])
        unknown, // index 5[2]
        unknown, // index 5[3]
        unknown, // index 5[4]
        TimestampTuple, // created_at timestamp (index 5[5])
      ],
    ]
  >,
];

export type SourceData = [
  [string], // id (index 0)
  string, // title (index 1)
  MetadataArray, // metadata (index 2)
  [unknown, SourceStatus], // status info (index 3)
];

// Response types for transformSummaries
export type SummaryResponse = Array<SummaryPayload | null>;

export type SummaryPayload = Array<
  [
    string, // "wrb.fr" (index 0)
    string, // rpcId (index 1)
    string, // JSON string containing summary data (index 2)
  ]
>;

export type SummaryData = [
  [
    [
      unknown, // index 0
      [string], // summary text (index 1[0])
      [string[]], // topics (index 2[0])
      [string[]], // recommended questions (index 3[0])
    ],
  ],
];

export type SummaryContent = {
  summary: string;
  topics: string[];
  recommended_questions: string[];
};
