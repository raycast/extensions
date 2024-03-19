export type GiphyResponse = {
  data: {
    id: string;
    type: string;
    title: string;
    images: {
      fixed_height: {
        url: string;
      };
      fixed_width: {
        url: string;
      };
    };
  };
  meta: {
    status: number;
    msg: string;
    response_id: string;
  };
};

export type Preferences = {
  focusIntervalDuration: string;
  shortBreakIntervalDuration: string;
  longBreakIntervalDuration: string;
  completionImage: string;
  sound: string;
  enableTimeOnMenuBar: boolean;
  giphyAPIKey: string;
  enableImage: boolean;
  enableQuote: boolean;
};

export type IntervalType = "focus" | "short-break" | "long-break";

type Part = {
  startedAt: number;
  pausedAt?: number;
};

export type Interval = {
  parts: Part[];
  length: number;
  type: IntervalType;
};

export type IntervalExecutor = {
  title: string;
  onStart: () => void;
};

export type Quote = {
  _id: string;
  content: string;
  author: string;
  authorSlug: string;
  length: number;
  tags: string[];
};
