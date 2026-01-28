export interface Timeline {
  abstract_deadline: string;
  deadline: string;
}

export interface Conference {
  year: number;
  id: string;
  link: string;
  timeline: Timeline[];
  timezone: string;
  date: string;
  place: string;
}

export interface Item {
  title: string;
  description: string;
  sub: string;
  rank: {
    ccf: string;
    core: string;
    thcpl: string;
  };
  dblp: string;
  confs: Conference[];
}

export interface GitHubContent {
  name: string;
  path: string;
  type: string;
  url: string;
  download_url: string | null;
}
