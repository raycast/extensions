export interface ErrInfo {
  errorIdx: number;
  orgStr: string;
  help: string;
  start: number;
  end: number;
  candWords: string[];
}

export interface CheckerResponse {
  userText: string;
  errInfos: ErrInfo[];
}

export interface UserActions {
  COPY: (content: string) => Promise<void>;
  TWITTER: (url: string) => Promise<void>;
}

export type ActionType = keyof UserActions;
