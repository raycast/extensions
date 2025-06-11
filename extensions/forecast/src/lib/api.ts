import { showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";
import { forecast } from "./forecastClient";
import { Assignment, Client, Person, Project, ForecastEntry } from "../types";

const linearRegex = /https:\/\/linear\.app\/[\w-]+\/issue\/([\w-]+)/;

export async function getPeople(): Promise<{ id: string; name: string; avatar: string }[]> {
  try {
    const peopleData = await forecast.people();

    return peopleData
      .filter((person: Person) => !person.archived)
      .filter((person: Person) => person.roles.includes("Dev"))
      .sort((a: Person, b: Person) => a.first_name.localeCompare(b.first_name))
      .map((person: Person) => ({
        id: person.id.toString(),
        name: `${person.first_name} ${person.last_name}`,
        avatar: person.avatar_url,
      }));
  } catch (error) {
    showToast(Toast.Style.Failure, "Could not fetch people", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

export async function getForecast(
  personId: string,
  date: Date,
  doneIds: number[],
  people?: { id: string; name: string; avatar: string }[],
): Promise<ForecastEntry[]> {
  if (!personId) {
    return [];
  }

  try {
    const peopleData = people || (await getPeople());

    const options = {
      startDate: dayjs(date).startOf("day").format("YYYY-MM-DD"),
      endDate: dayjs(date).endOf("day").format("YYYY-MM-DD"),
    };

    const [assignments, projects, clients] = await Promise.all([
      forecast.assignments(options),
      forecast.projects(),
      forecast.clients(),
    ]);

    const personIds = peopleData.map((p) => p.id);

    const filteredAssignments =
      personId === "all"
        ? assignments.filter((assignment: Assignment) => personIds.includes(assignment.person_id.toString()))
        : assignments.filter((assignment: Assignment) => assignment.person_id.toString() === personId);

    return filteredAssignments.map((assignment: Assignment) => {
      const project = projects.find((p: Project) => p.id === assignment.project_id);
      const client = clients.find((c: Client) => project && c.id === project.client_id);
      const person = peopleData.find((p) => p.id === assignment.person_id.toString());

      let projectName = project?.name ?? "No project";

      const urlsInNote =
        assignment.notes?.match(/\b((https?:)?\/\/|(www)\.)[-A-Z0-9+&@#/%?=~_|$!:,.;]*[A-Z0-9+&@#/%?=~_|$]/gi) ?? [];

      const urls = urlsInNote.map((url: string) => ({
        url,
        linearId: url.match(linearRegex)?.[1] || false,
      }));

      projectName = projectName.replace(/^\[(01|02|03)\]\s*/, "");

      const linearIdFromNameMatch = projectName.match(/\[(\d+)\]/);
      if (linearIdFromNameMatch) {
        const linearId = `DEV-${linearIdFromNameMatch[1]}`;
        projectName = projectName.replace(linearIdFromNameMatch[0], "").trim();
        const linearUrl = `https://linear.app/simplygoodwork/issue/${linearId}`;

        if (!urls.some((u) => u.linearId === linearId)) {
          urls.push({
            url: linearUrl,
            linearId: linearId,
          });
        }
      }

      if (assignment.notes) {
        const linearIdsFromNotes = [...assignment.notes.matchAll(/\[(\d+)\]/g)];
        if (linearIdsFromNotes.length > 0) {
          linearIdsFromNotes.forEach((match) => {
            const linearId = `DEV-${match[1]}`;
            const linearUrl = `https://linear.app/simplygoodwork/issue/${linearId}`;
            if (!urls.some((u) => u.linearId === linearId)) {
              urls.push({
                url: linearUrl,
                linearId: linearId,
              });
            }
          });
        }
      }

      projectName = projectName.replace(/\s*\(\d+(-\d+)?\s*(hours?|hrs)\)$/i, "").trim();

      const hasLinear = urls.some((url) => url.linearId);
      const isDone = doneIds.includes(assignment.id);

      const hours = dayjs.duration(assignment.allocation, "seconds").asHours();

      return {
        id: assignment.id,
        title: projectName,
        client: client?.name ?? "No client",
        notes: assignment.notes ?? "",
        urls,
        duration: `${hours} hour${hours === 1 ? "" : "s"}`,
        hasLinear,
        isDone,
        allocation: assignment.allocation,
        personName: person?.name ?? "Unknown",
        personId: assignment.person_id,
      };
    });
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Could not fetch schedule",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }
}
