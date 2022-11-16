import { createChallenge } from "./lib/utils";

export default async () =>
  createChallenge({
    base: 180,
    timeIncrement: 2,
  });
