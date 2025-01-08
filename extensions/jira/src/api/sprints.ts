import { request } from "./request";

type SprintResult = {
  value: string;
  displayName: string;
};

type DetailedSprint = {
  id: string;
  name: string;
  state: "active" | "future" | "closed";
  startDate?: string;
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
      try {
        return request<DetailedSprint>(`/sprint/${sprint.value}`, { useAgileApi: true });
      } catch (error) {
        return null;
      }
    }),
  );

  const filteredSprints = allSprints.filter((sprint) => sprint !== null) as DetailedSprint[];

  // show active sprints first, then future sprints, then closed sprints
  filteredSprints.sort((sprintA, sprintB) => {
    const stateOrder = { active: 0, future: 1, closed: 2 };

    if (stateOrder[sprintA.state] !== stateOrder[sprintB.state]) {
      return stateOrder[sprintA.state] - stateOrder[sprintB.state];
    } else if (sprintA.startDate && sprintB.startDate) {
      return sprintA.startDate.localeCompare(sprintB.startDate);
    } else if (!sprintA.startDate) {
      return 1;
    } else if (!sprintB.startDate) {
      return -1;
    } else {
      return sprintA.name.localeCompare(sprintB.name);
    }
  });

  return filteredSprints;
}
