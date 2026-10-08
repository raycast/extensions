import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 1200,
    timeIncrement: 0,
  });
