import { CommitType } from "./commitType";

export type CommitMessage = CommitType & {
  message: string;
  body?: string;
  contentAction?: string;
};
