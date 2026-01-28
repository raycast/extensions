type CommonJoke = {
  category: "Misc" | "Programming" | "Dark" | "Pun" | "Spooky" | "Christmas";
  flags: {
    nsfw: boolean;
    religious: boolean;
    political: boolean;
    racist: boolean;
    sexist: boolean;
    explicit: boolean;
  };
  id: number;
  safe: boolean;
  lang: string;
};
export type SingleJoke = CommonJoke & {
  type: "single";
  joke: string;
};
export type TwoPartJoke = CommonJoke & {
  type: "twopart";
  setup: string;
  delivery: string;
};

type MultipleJokesResponse = {
  error: false;
  amount: number;
  jokes: (SingleJoke | TwoPartJoke)[];
};
type SingularJokeResponse = {
  error: false;
} & (SingleJoke | TwoPartJoke);
export type JokeResponse = SingularJokeResponse | MultipleJokesResponse;

export type ErrorResponse = {
  error: true;
  internalError: boolean;
  code: number;
  message: string;
  causedBy: string[];
  additionalInfo: string;
  timestamp: number;
};
