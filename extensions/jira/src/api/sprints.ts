import { request } from "./request";

type SprintResult = {
  value: string;
  displayName: string;
};

type DetailedSprint = {
  id: string;
  name: string;
  state: "active" | "future" | "closed";
  startDate: string;
  endDate: string;
};

type GetSprintsParams = {
  fieldName: string;
  fieldValue: string;
};

export async function getSprints({ fieldName, fieldValue }: GetSprintsParams) {
  const response = await request<{ results: SprintResult[] }>("/jql/autocompletedata/suggestions", {
    params: { fieldName, fieldValue },
  });

  const sprints = response?.results || [];

  const allSprints = await Promise.all(
    sprints.map((sprint) => {
      return request<DetailedSprint>(`/sprint/${sprint.value}`, { useAgileApi: true });
    })
  );

  const filteredSprints = allSprints.filter(
    (sprint) => sprint?.state === "active" || sprint?.state === "future"
  ) as DetailedSprint[];

  return filteredSprints.map((sprint) => {
    return {
      ...sprint,
      name: `${sprint.name} (${sprint.state})`,
    };
  });
}
