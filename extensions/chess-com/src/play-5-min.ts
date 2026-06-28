import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 300,
    timeIncrement: 0,
  });
