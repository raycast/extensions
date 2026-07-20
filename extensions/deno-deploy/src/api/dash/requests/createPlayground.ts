import type { Project } from "@/api/types";
import type { RequestOptions } from "@/utils/fetch";

import { createWindowLessFetcher } from "../";

export type CreatePlaygroundMediaType = "ts" | "js" | "tsx" | "jsx";

export const createPlayground = (
  organizationId: string,
  snippet: string,
  mediaType: CreatePlaygroundMediaType = "ts",
  opts: RequestOptions = {},
): Promise<Project> => {
  const body = {
    organizationId,
    playground: {
      mediaType,
      snippet,
    },
  };
  return createWindowLessFetcher()
    .request(`/projects`, {
      method: "POST",
      body: JSON.stringify(body),
      ...opts,
    })
    .then((res) => res.json() as Promise<Project>);
};
