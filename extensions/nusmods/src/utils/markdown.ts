import { CourseDetails, Prereq, SemesterData, Timetable } from "./nusmods";

const formatWorkload = (workload?: number[]) => {
  if (!workload) return null;
  const categories = ["Lecture", "Tutorial", "Lab", "Project", "Preparation"];
  return workload.map((hours, i) => `- ${categories[i]}: ${hours} hours`).join("\n");
};

const MODULE_PREREQ_REG = /(\w+)(?::([a-zA-Z]))?/;

const formatPrereqTree = (tree?: Prereq): string => {
  if (!tree) return "";

  const sections: string[] = [];

  const dfs = (node: Prereq | string, depth: number = 0) => {
    const indent = " ".repeat(depth * 2);

    if (typeof node === "string") {
      const match = node.match(MODULE_PREREQ_REG);
      if (match === null || match.length !== 3 || !match[2]) {
        sections.push(`${indent}- ${node}`);
        return;
      }

      const moduleCode = match[1];
      const minGrade = match[2];
      sections.push(`${indent}- ${moduleCode} (at least ${minGrade})`);
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

    if ("nOf" in node) {
      const [n, children] = node.nOf;

      sections.push(`${indent}- At least ${n} of:`);
      children.forEach((child) => dfs(child, depth + 1));
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

export const generateMarkdown = (data?: CourseDetails | null) => {
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
  if (data.corequisite) {
    sections.push("\n---");
    sections.push(`\n## Corequisite\n${data.corequisite}`);
  }
  if (data.prereqTree) {
    sections.push("\n---");
    sections.push(`\n## Prerequisites\n${data.prerequisite}`);
    sections.push(`\n${formatPrereqTree(data.prereqTree)}`);
  }

  return sections.join("\n");
};
