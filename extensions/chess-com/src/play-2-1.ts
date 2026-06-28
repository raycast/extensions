import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 120,
    timeIncrement: 1,
  });
