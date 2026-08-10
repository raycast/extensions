import { request } from "./request";

type GetLabelsResponse = {
  values: string[];
};

export async function getLabels() {
  const result = await request<GetLabelsResponse>("/label");
  return result?.values;
}
