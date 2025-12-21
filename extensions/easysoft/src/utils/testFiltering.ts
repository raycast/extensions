import { Subject } from "../types";

export function getUpcomingTests(subjects: Subject[], today: Date): Subject[] {
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  const filteredTests = subjects.filter((subject) => subject.type === "Checkpoint" || subject.type === "Assessment");

  return filteredTests.filter((test) => {
    if (!test.endDate) return true;
    const endDate = new Date(test.endDate);
    return endDate >= normalizedToday;
  });
}

export function formatDaysUntilTest(dateString: string): string {
  const testDate = new Date(dateString);
  const today = new Date();

  // Normalize to start of day for accurate day difference
  testDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = testDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Tomorrow";
  } else {
    return `In ${diffDays} days`;
  }
}

/**
 * Filters and sorts subjects with published results
 * Following results-backend.md documentation
 */
export function getPublishedSubjects(subjects: Subject[]): Subject[] {
  return subjects
    .filter((subject) => subject.resultReportStatus === "REPORTED")
    .sort((a, b) => {
      if (!a.endDate || !b.endDate) return 0;
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });
}
