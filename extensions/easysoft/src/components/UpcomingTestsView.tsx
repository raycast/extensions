import { List, Detail, showToast, Toast, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSubjects, getAssessment, getAssignment } from "../api/tests";
import { getUpcomingTests, formatDaysUntilTest } from "../utils/testFiltering";
import { htmlToMarkdown } from "../utils/htmlParser";
import { Subject, AssessmentData } from "../types";

interface UpcomingTestsViewProps {
  onLogout: () => void;
}

export function UpcomingTestsView({ onLogout }: UpcomingTestsViewProps) {
  const [tests, setTests] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<Subject | null>(null);
  const [assessmentData, setAssessmentData] = useState<Record<string, AssessmentData>>({});
  const [loadingAssessments, setLoadingAssessments] = useState<Set<string>>(new Set());
  const [assignmentDetails, setAssignmentDetails] = useState<Record<string, Subject>>({});
  const [loadingAssignments, setLoadingAssignments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTests();
  }, []);

  async function loadAssessmentForTest(testId: string) {
    // Check if already loaded or loading
    if (assessmentData[testId] || loadingAssessments.has(testId)) {
      return;
    }

    setLoadingAssessments((prev) => new Set(prev).add(testId));
    try {
      const assessment = await getAssessment(testId);
      setAssessmentData((prev) => ({ ...prev, [testId]: assessment }));
    } catch (error) {
      console.error(`Failed to load assessment for ${testId}:`, error);
    } finally {
      setLoadingAssessments((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  }

  async function loadTests() {
    setIsLoading(true);
    try {
      const subjects = await getSubjects();
      const today = new Date();
      const upcomingTests = getUpcomingTests(subjects, today);
      setTests(upcomingTests);

      // Load assessments for tests with published results (progressive loading)
      const testsWithResults = upcomingTests.filter((test) => test.resultReportStatus === "REPORTED");

      // Load first batch of assessments (3 at a time)
      const batchSize = 3;
      const firstBatch = testsWithResults.slice(0, batchSize);
      await Promise.all(firstBatch.map((test) => loadAssessmentForTest(test.id)));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tests",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAssignmentDetails(testId: string) {
    // Check if already loaded or loading
    if (assignmentDetails[testId] || loadingAssignments.has(testId)) {
      return;
    }

    setLoadingAssignments((prev) => new Set(prev).add(testId));
    try {
      const assignment = await getAssignment(testId);
      setAssignmentDetails((prev) => ({ ...prev, [testId]: assignment }));
    } catch (error) {
      console.error(`Failed to load assignment details for ${testId}:`, error);
      // Don't show error toast - just use the basic test info
    } finally {
      setLoadingAssignments((prev) => {
        const next = new Set(prev);
        next.delete(testId);
        return next;
      });
    }
  }

  function formatTestDetail(test: Subject): string {
    // Use detailed assignment data if available, otherwise use basic test data
    const detailedTest = assignmentDetails[test.id] || test;
    const description = detailedTest.description || test.description;

    let markdown = `# ${detailedTest.title || test.title}\n\n`;

    if (detailedTest.subTitle || test.subTitle) {
      markdown += `## ${detailedTest.subTitle || test.subTitle}\n\n`;
    }

    if (detailedTest.type || test.type) {
      markdown += `**Type:** ${detailedTest.type || test.type}\n\n`;
    }

    if (test.endDate) {
      markdown += `**Date:** ${new Date(test.endDate).toLocaleDateString()} (${formatDaysUntilTest(test.endDate)})\n\n`;
    }

    if (detailedTest.publishDate || test.publishDate) {
      markdown += `**Published:** ${new Date((detailedTest.publishDate || test.publishDate)!).toLocaleDateString()}\n\n`;
    }

    // Description section - make it prominent (from backend docs)
    // Parse HTML description to markdown
    if (description) {
      const parsedDescription = htmlToMarkdown(description);
      markdown += `---\n\n## Description\n\n${parsedDescription}\n\n`;
    } else if (loadingAssignments.has(test.id)) {
      markdown += `---\n\n## Description\n\n*Loading detailed description...*\n\n`;
    }

    if (test.resultReportStatus === "REPORTED" && assessmentData[test.id]) {
      markdown += `---\n\n## Assessment Results\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(assessmentData[test.id], null, 2)}\n\`\`\`\n`;
    } else if (test.resultReportStatus === "REPORTED" && loadingAssessments.has(test.id)) {
      markdown += `---\n\n## Assessment Results\n\n*Loading...*\n`;
    }

    return markdown;
  }

  if (selectedTest) {
    return (
      <Detail
        markdown={formatTestDetail(selectedTest)}
        actions={
          <ActionPanel>
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={() => setSelectedTest(null)} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadTests} />
            <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tests..."
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadTests} />
          <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
        </ActionPanel>
      }
    >
      {tests.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Upcoming Tests"
          description="You have no upcoming tests or checkpoints."
        />
      ) : (
        tests.map((test) => (
          <List.Item
            key={test.id}
            title={test.title}
            subtitle={test.subTitle || test.type}
            accessories={[
              test.endDate
                ? {
                    text: formatDaysUntilTest(test.endDate),
                    icon: Icon.Calendar,
                  }
                : { text: "No date", icon: Icon.Calendar },
              test.resultReportStatus === "REPORTED" ? { icon: Icon.CheckCircle, tooltip: "Results available" } : {},
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => {
                    // Load assignment details for full description (from backend docs)
                    loadAssignmentDetails(test.id);
                    // Load assessment if not already loaded
                    if (test.resultReportStatus === "REPORTED") {
                      loadAssessmentForTest(test.id);
                    }
                    setSelectedTest(test);
                  }}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadTests} />
                <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
