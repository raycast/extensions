import { request } from "./request";

type SprintResult = {
  value: string;
  displayName: string;
};

type GetSprintsParams = {
  fieldName: string;
  fieldValue: string;
};

export async function getSprints({ fieldName, fieldValue }: GetSprintsParams) {
  const response = await request<{ results: SprintResult[] }>("/jql/autocompletedata/suggestions", {
    params: { fieldName, fieldValue },
  });

  return response?.results;
}
