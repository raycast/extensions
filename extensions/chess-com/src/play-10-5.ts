import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 600,
    timeIncrement: 5,
  });
