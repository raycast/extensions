import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { useCallback } from "react";
import { currentAcadYear } from "../search-nus-courses";
import { API_BASE_URL, WEBSITE_BASE_URL } from "../utils/constants";
import { CourseDetails, CourseDetailsSchema, CourseSummary, Prereq, SemesterData, Timetable } from "../utils/nusmods";

const formatWorkload = (workload?: number[]) => {
  if (!workload) return null;
  const categories = ["Lecture", "Tutorial", "Lab", "Project", "Preparation"];
  return workload.map((hours, i) => `- ${categories[i]}: ${hours} hours`).join("\n");
};

const formatPrereqTree = (tree?: Prereq): string => {
  if (!tree) return "";

  const sections: string[] = [];

  const dfs = (node: Prereq | string, depth: number = 0) => {
    const indent = " ".repeat(depth * 2);

    if (typeof node === "string") {
      sections.push(`${indent}- ${node}`);
      return;
    }

    if ("and" in node) {
      sections.push(`${indent}- All of:`);
      node.and.forEach((child) => dfs(child, depth + 1));
      return;
    }

    if ("or" in node) {
      sections.push(`${indent}- One of:`);
      node.or.forEach((child) => dfs(child, depth + 1));
      return;
    }
  };

  sections.push("```");
  dfs(tree);
  sections.push("```");

  return sections.join("\n");
};

const formatTimetableSlot = (slot: Timetable): string => {
  const venue = slot.venue.trim() ? ` at ${slot.venue}` : "";
  return `- ${slot.lessonType} (${slot.day} ${slot.startTime}-${slot.endTime}${venue})`;
};

const formatTimetable = (semesterData: Array<SemesterData>) => {
  if (!semesterData?.length) return "";

  const sections: string[] = [];

  semesterData.forEach((sem) => {
    const semesterDetails: string[] = [`### Semester ${sem.semester}`];

    if (sem.examDate) {
      const examDate = new Date(sem.examDate);
      semesterDetails.push(`- Exam Date: ${examDate.toLocaleString()}`);
    }

    if (sem.examDuration) {
      semesterDetails.push(`- Exam Duration: ${sem.examDuration} hours`);
    }

    if (sem.timetable?.length) {
      semesterDetails.push("#### Timetable");
      const timetableSlots = sem.timetable.map(formatTimetableSlot);
      semesterDetails.push(...timetableSlots);
    }

    sections.push(semesterDetails.join("\n"));
  });

  return sections.join("\n\n");
};

const generateMarkdown = (data?: CourseDetails | null) => {
  if (!data) return "";

  const sections: string[] = [];

  sections.push(`# ${data.moduleCode}: ${data.title}`);
  sections.push(`\n## Description\n${data.description}`);
  if (data.additionalInformation) {
    sections.push(`\n## Additional Information\n${data.additionalInformation}`);
  }
  if (data.workload) {
    sections.push(`\n## Weekly Workload\n${formatWorkload(data.workload)}`);
  }
  if (data.semesterData?.length) {
    sections.push(`\n## Semester Information\n${formatTimetable(data.semesterData)}`);
  }
  if (data.prereqTree) {
    sections.push(`\n## Prerequisites\n${formatPrereqTree(data.prereqTree)}`);
  }

  return sections.join("\n");
};

const CourseDetail: React.FC<{
  moduleCode: string;
}> = (props) => {
  const parseResponse = useCallback(async (res: Response) => {
    if (!res.ok) {
      showFailureToast({
        title: "Failed to fetch course details",
        message: "Please try again later.",
      });
      return null;
    }

    const data = await res.json();
    if (!data) {
      showFailureToast({
        title: "Failed to unmarshal course details",
        message: "Please try again later.",
      });
      return null;
    }

    const parseResult = await CourseDetailsSchema.safeParseAsync(data);
    if (!parseResult.success) {
      console.error("Failed to parse course details", JSON.stringify(parseResult.error));
      showFailureToast({
        title: "Validation error",
        message: "Unexpected course details data received, please report this issue.",
      });
      return null;
    }

    return parseResult.data;
  }, []);

  const { isLoading, data, error } = useFetch(`${API_BASE_URL}/${currentAcadYear}/modules/${props.moduleCode}.json`, {
    keepPreviousData: true,
    initialData: {} as CourseSummary,
    parseResponse,
  });

  const nusModsUrl = `${WEBSITE_BASE_URL}/courses/${props.moduleCode}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={props.moduleCode}
      markdown={error ? "Something went wrong, please report this issue" : generateMarkdown(data)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={nusModsUrl} />
        </ActionPanel>
      }
      metadata={
        error ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Module Code" text={data?.moduleCode} />
            <Detail.Metadata.Label title="Academic Year" text={data?.acadYear} />
            <Detail.Metadata.Label title="Module Title" text={data?.title} />
            <Detail.Metadata.Label title="Department" text={data?.department} />
            <Detail.Metadata.Label title="Faculty" text={data?.faculty} />
            <Detail.Metadata.Label title="Module Credit" text={data?.moduleCredit} />
            {data?.gradingBasisDescription && (
              <Detail.Metadata.Label title="Grading Basis" text={data?.gradingBasisDescription} />
            )}
            {data?.prerequisite && <Detail.Metadata.Label title="Prerequisite" text={data?.prerequisite} />}
            {data?.preclusion && <Detail.Metadata.Label title="Preclusion" text={data?.preclusion} />}

            <Detail.Metadata.Separator />

            {data?.fulfillRequirements && (
              <Detail.Metadata.TagList title="Fulfill Requirements">
                {data?.fulfillRequirements.map((req) => <Detail.Metadata.TagList.Item key={req} text={req} />)}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Link title="Open in NUSMods" target={nusModsUrl} text="NUSMods" />
          </Detail.Metadata>
        )
      }
    />
  );
};

export const CourseSummaryList: React.FC<{
  courseSummaries: Array<CourseSummary>;
}> = (props) => {
  const { courseSummaries } = props;

  return courseSummaries.length === 0 ? (
    <List.EmptyView icon={Icon.Bird} title="No courses found" description="Try a different academic year." />
  ) : (
    courseSummaries.map((courseSummary) => (
      <List.Item
        key={courseSummary.moduleCode}
        keywords={[courseSummary.moduleCode, courseSummary.title]}
        title={courseSummary.moduleCode}
        subtitle={courseSummary.title}
        accessories={[
          {
            text: "Semesters: " + courseSummary.semesters.join(", "),
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<CourseDetail moduleCode={courseSummary.moduleCode} />} />
          </ActionPanel>
        }
      />
    ))
  );
};
