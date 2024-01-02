import { Author } from "./Author";
import { Problem } from "./Problem";

export interface Result {
  id?: number;
  contestId?: number;
  creationTimeSeconds?: number;
  relativeTimeSeconds?: number;
  problem?: Problem;
  author?: Author;
  programmingLanguage?: string;
  verdict?: string;
  testset?: string;
  passedTestCount?: number;
  timeConsumedMillis?: number;
  memoryConsumedBytes?: number;
}

export const emptyResult: Result = {
  id: 0,
  contestId: 0,
  creationTimeSeconds: 0,
  relativeTimeSeconds: 0,
  problem: {
    contestId: 0,
    index: "",
    name: "",
    type: "",
    points: 0.0,
    rating: 0,
    tags: [],
  },
  author: {
    contestId: 0,
    members: [{ handle: "" }],
    participantType: "",
    ghost: false,
    room: 0,
    startTimeSeconds: 0,
  },
  programmingLanguage: "",
  verdict: "",
  testset: "",
  passedTestCount: 0,
  timeConsumedMillis: 0,
  memoryConsumedBytes: 0,
};
