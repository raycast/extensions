import { nodeApi, TanaResponse } from "./helpers";

export async function createNode(note: string) {
  const res = await nodeApi.get<TanaResponse>("/addToNode", {
    params: { note },
  });

  if (typeof res.data === "object" && res.data.err) {
    throw new Error(res.data.err);
  }
}
