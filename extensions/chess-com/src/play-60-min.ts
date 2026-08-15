import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 3600,
    timeIncrement: 0,
  });
