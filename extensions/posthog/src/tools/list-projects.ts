import { listProjects } from "../posthog-client";

type Input = {
  search?: string;
  limit?: number;
};

export default async function tool({ search, limit }: Input = {}) {
  return listProjects(search, limit);
}
