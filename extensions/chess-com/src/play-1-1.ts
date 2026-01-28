import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 60,
    timeIncrement: 1,
  });
