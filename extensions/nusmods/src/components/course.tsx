import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useCallback } from "react";
import { API_BASE_URL, WEBSITE_BASE_URL } from "../utils/constants";
import { CourseDetails, CourseDetailsSchema, CourseSummary, Prereq, SemesterData, Timetable } from "../utils/nusmods";

const formatWorkload = (workload?: number[]) => {
  if (!workload) return null;
  const categories = ["Lecture", "Tutorial", "Lab", "Project", "Preparation"];
  return workload.map((hours, i) => `- ${categories[i]}: ${hours} hours`).join("\n");
};

const formatPrereqTree = (tree?: Prereq, prerequisite?: string): string => {
  if (!tree) return "";

  const sections: string[] = [];

  if (prerequisite) {
    sections.push(prerequisite);
  }

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

  sections.push("#### Prerequisite Tree");
  sections.push("```");
  dfs(tree);
  sections.push("```");

  return sections.join("\n");
};

const formatTimetableSlots = (timetable: Timetable[]): string => {
  if (!timetable?.length) return "";

  const grouped = timetable.reduce(
    (acc, slot) => {
      const key = `${slot.lessonType}`;
      if (!acc[key]) {
        acc[key] = new Map<string, Timetable[]>();
      }
      if (!acc[key].has(slot.classNo)) {
        acc[key].set(slot.classNo, []);
      }
      acc[key].get(slot.classNo)?.push(slot);
      return acc;
    },
    {} as Record<string, Map<string, Timetable[]>>,
  );

  const sections: string[] = [];

  const formatClass = (slot: Timetable, index: number) => {
    sections.push(`- Session ${index + 1}`);
    sections.push(`  - ${slot.day}: ${slot.startTime} - ${slot.endTime}`);
    if (slot.venue) {
      sections.push(`  - Venue: ${slot.venue}`);
    }
    if (slot.size) {
      sections.push(`  - Class Size: ${slot.size}`);
    }
  };

  const sortedEntries = Object.entries(grouped).toSorted(([a], [b]) => a.localeCompare(b));
  for (const [lessonType, classSessions] of sortedEntries) {
    const sortedClassSessions = Array.from(classSessions.entries()).sort(([a], [b]) => {
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (isNaN(aNum) || isNaN(bNum)) {
        return a.localeCompare(b);
      }

      return aNum - bNum;
    });

    sortedClassSessions.forEach(([classNo, sessions]) => {
      sections.push(`\n#### ${lessonType} (group ${classNo})`);

      sessions.forEach((session, index) => {
        formatClass(session, index);
      });
    });
  }

  return sections.join("\n");
};

const formatTimetable = (semesterData: Array<SemesterData>) => {
  if (!semesterData?.length) return "";

  const sections: string[] = [];

  semesterData.forEach((sem, index) => {
    if (index > 0) {
      sections.push("\n---");
    }

    const semesterDetails: string[] = [`### Semester ${sem.semester}`];

    if (sem.examDate) {
      const examDate = new Date(sem.examDate);
      semesterDetails.push(`- Exam Date: ${examDate.toLocaleString()}`);
    }

    if (sem.examDuration) {
      semesterDetails.push(`- Exam Duration: ${sem.examDuration} minutes`);
    }

    if (sem.timetable?.length) {
      semesterDetails.push("\n### Timetable");
      semesterDetails.push(formatTimetableSlots(sem.timetable));
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
    sections.push("\n---");
    sections.push(`\n## Weekly Workload\n${formatWorkload(data.workload)}`);
  }
  if (data.semesterData?.length) {
    sections.push("\n---");
    sections.push(`\n## Semester Information\n${formatTimetable(data.semesterData)}`);
  }
  if (data.preclusion) {
    sections.push("\n---");
    sections.push(`\n## Preclusion\n${data.preclusion}`);
  }
  if (data.prereqTree) {
    sections.push("\n---");
    sections.push(`\n## Prerequisites\n${formatPrereqTree(data.prereqTree, data.prerequisite)}`);
  }

  return sections.join("\n");
};

const CourseDetail: React.FC<{
  moduleCode: string;
  acadYear: string;
}> = (props) => {
  const parseResponse = useCallback(async (res: Response) => {
    if (!res.ok) {
      console.error("Failed to fetch course details:", res.status, res.statusText);
      showToast({
        title: "Failed to fetch course details",
        message: "Please try again later.",
        style: Toast.Style.Failure,
      });
      return null;
    }

    const data = await res.json();
    if (!data) {
      console.error("Failed to unmarshal course details");
      showToast({
        title: "Failed to unmarshal course details",
        message: "Please try again later.",
        style: Toast.Style.Failure,
      });
      return null;
    }

    const parseResult = await CourseDetailsSchema.safeParseAsync(data);
    if (!parseResult.success) {
      console.error("Failed to parse course details", JSON.stringify(parseResult.error));
      showToast({
        title: "Validation error",
        message: "Unexpected course details data received from NUSMods API, please report this issue.",
        style: Toast.Style.Failure,
      });
      return null;
    }

    return parseResult.data;
  }, []);

  const { isLoading, data, error } = useFetch(`${API_BASE_URL}/${props.acadYear}/modules/${props.moduleCode}.json`, {
    parseResponse,
  });

  const nusModsUrl = `${WEBSITE_BASE_URL}/courses/${props.moduleCode}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={props.moduleCode}
      markdown={error ? "Unable to load course details." : generateMarkdown(data)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={nusModsUrl} />
        </ActionPanel>
      }
      metadata={
        error || !data ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Module Code" text={data.moduleCode} />
            <Detail.Metadata.Label title="Academic Year" text={data.acadYear} />
            <Detail.Metadata.Label title="Module Title" text={data.title} />
            <Detail.Metadata.Label title="Department" text={data.department} />
            <Detail.Metadata.Label title="Faculty" text={data.faculty} />
            <Detail.Metadata.Label title="Module Credit" text={data.moduleCredit} />
            {data.gradingBasisDescription && (
              <Detail.Metadata.Label title="Grading Basis" text={data.gradingBasisDescription} />
            )}
            {data?.fulfillRequirements && (
              <Detail.Metadata.TagList title="Fulfill Requirements">
                {data?.fulfillRequirements.map((req) => <Detail.Metadata.TagList.Item key={req} text={req} />)}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Open in NUSMods" target={nusModsUrl} text="NUSMods" />
          </Detail.Metadata>
        )
      }
    />
  );
};

export const CourseSummaryList: React.FC<{
  courseSummaries: Array<CourseSummary>;
  acadYear: string;
}> = (props) => {
  const { courseSummaries, acadYear } = props;

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
            <Action.Push
              title="Show Details"
              target={<CourseDetail moduleCode={courseSummary.moduleCode} acadYear={acadYear} />}
            />
          </ActionPanel>
        }
      />
    ))
  );
};
