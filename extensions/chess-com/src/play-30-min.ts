import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 1800,
    timeIncrement: 0,
  });
