type LivePage = {
  pathname: string;
  hostname: string;
  total: number;
};

type LiveReferrer = {
  referrer_hostname: string;
  referrer_pathname: string;
  total: number;
};

export type LiveData = {
  total: number;
  content: LivePage[];
  referrers: LiveReferrer[];
};
