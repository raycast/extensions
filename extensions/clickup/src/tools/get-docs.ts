import { DocsResponse } from "../types/docs.dt";
import { ClickUpClient } from "../utils/clickUpClient";

export default async function ({ teamId }: { teamId: string }) {
  const res = await ClickUpClient<DocsResponse>(`/workspaces/${teamId}/docs`, undefined, undefined, undefined, 3);
  return res.data.docs;
}
