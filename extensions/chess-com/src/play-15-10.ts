import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 900,
    timeIncrement: 10,
  });
