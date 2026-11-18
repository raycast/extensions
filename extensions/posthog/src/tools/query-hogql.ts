import { runHogQL } from "../posthog-client";

type Input = {
  projectId?: number;
  query: string;
  maxRows?: number;
  maxCellLength?: number;
};

export default async function tool(input: Input) {
  return runHogQL(input);
}
