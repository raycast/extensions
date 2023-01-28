export type Draft = {
  id: number;
  text_first_tweet: string;
  num_tweets: number;
  scheduled_date: Date;
};

export type ExtensionPreferences = {
  token: string;
};

export type CreateDraftValues = {
  content: string;
  threadify: boolean;
  scheduleDate: Date | null;
  shareOptions: string;
};

export type Tweet = {
  id: number;
  text_first_tweet: string;
  published_on: Date;
  twitter_url: string;
};
