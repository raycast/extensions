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

export type IntervalType = "focus" | "short-break" | "long-break";

type Part = {
  startedAt: number;
  pausedAt?: number;
  endAt?: number;
};

export type Interval = {
  id: number;
  parts: Part[];
  length: number;
  type: IntervalType;
};

export type IntervalExecutor = {
  title: string;
  onStart: () => void;
};

export type Quote = {
  q: string;
  a: string;
  h: string;
};
