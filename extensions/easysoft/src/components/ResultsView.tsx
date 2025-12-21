import { List, Detail, showToast, Toast, ActionPanel, Action, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSubjects, getAssessment, getAssignment } from "../api/tests";
import { getPublishedSubjects } from "../utils/testFiltering";
import { htmlToMarkdown } from "../utils/htmlParser";
import { Subject, AssessmentData } from "../types";

interface ResultsViewProps {
  onLogout: () => void;
}

export function ResultsView({ onLogout }: ResultsViewProps) {
  const [results, setResults] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<Subject | null>(null);
  const [assessmentData, setAssessmentData] = useState<Record<string, AssessmentData>>({});
  const [loadingAssessments, setLoadingAssessments] = useState<Set<string>>(new Set());
  const [assignmentDetails, setAssignmentDetails] = useState<Record<string, Subject>>({});
  const [loadingAssignments, setLoadingAssignments] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadResults();
  }, []);

  async function loadAssessmentForResult(resultId: string) {
    // Check if already loaded or loading
    if (assessmentData[resultId] || loadingAssessments.has(resultId)) {
      return;
    }

    setLoadingAssessments((prev) => new Set(prev).add(resultId));
    try {
      const assessment = await getAssessment(resultId);
      setAssessmentData((prev) => ({ ...prev, [resultId]: assessment }));
    } catch (error) {
      console.error(`Failed to load assessment for ${resultId}:`, error);
    } finally {
      setLoadingAssessments((prev) => {
        const next = new Set(prev);
        next.delete(resultId);
        return next;
      });
    }
  }

  async function loadAssignmentDetails(resultId: string) {
    // Check if already loaded or loading
    if (assignmentDetails[resultId] || loadingAssignments.has(resultId)) {
      return;
    }

    setLoadingAssignments((prev) => new Set(prev).add(resultId));
    try {
      const assignment = await getAssignment(resultId);
      setAssignmentDetails((prev) => ({ ...prev, [resultId]: assignment }));
    } catch (error) {
      console.error(`Failed to load assignment details for ${resultId}:`, error);
    } finally {
      setLoadingAssignments((prev) => {
        const next = new Set(prev);
        next.delete(resultId);
        return next;
      });
    }
  }

  async function loadResults() {
    setIsLoading(true);
    try {
      const subjects = await getSubjects();
      const publishedResults = getPublishedSubjects(subjects);
      setResults(publishedResults);

      // Progressive loading of assessments (batches of 3, as per results-backend.md)
      const batchSize = 3;
      for (let i = 0; i < publishedResults.length; i += batchSize) {
        const batch = publishedResults.slice(i, i + batchSize);
        await Promise.all(batch.map((result) => loadAssessmentForResult(result.id)));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load results",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function formatResultDetail(result: Subject): string {
    // Use detailed assignment data if available, otherwise use basic result data
    const detailedResult = assignmentDetails[result.id] || result;

    let markdown = `# ${detailedResult.title || result.title}\n\n`;

    if (detailedResult.subTitle || result.subTitle) {
      markdown += `## ${detailedResult.subTitle || result.subTitle}\n\n`;
    }

    if (result.endDate) {
      markdown += `**Date:** ${new Date(result.endDate).toLocaleDateString()}\n\n`;
    }

    if (detailedResult.publishDate || result.publishDate) {
      markdown += `**Published:** ${new Date((detailedResult.publishDate || result.publishDate)!).toLocaleDateString()}\n\n`;
    }

    // Assessment Results section (from results-backend.md) - no title, just content
    if (assessmentData[result.id]) {
      markdown += `---\n\n`;
      const assessment = assessmentData[result.id];

      // Parse and format assessment data nicely
      if (typeof assessment === "object" && assessment !== null) {
        const assessmentObj = assessment as Record<string, unknown>;

        // Review/Grade
        if (assessmentObj.review) {
          markdown += `### Review\n\n**${assessmentObj.review}**\n\n`;
        }

        // Grade or Score (if different from review)
        if (assessmentObj.grade && assessmentObj.grade !== assessmentObj.review) {
          markdown += `**Grade:** ${assessmentObj.grade}\n\n`;
        }
        if (assessmentObj.score && assessmentObj.score !== assessmentObj.review) {
          markdown += `**Score:** ${assessmentObj.score}\n\n`;
        }

        // Teacher Comment
        if (assessmentObj.teacherComment) {
          const teacherComment =
            typeof assessmentObj.teacherComment === "string"
              ? htmlToMarkdown(assessmentObj.teacherComment)
              : String(assessmentObj.teacherComment);
          if (teacherComment.trim()) {
            markdown += `### Teacher Comment\n\n${teacherComment}\n\n`;
          }
        }

        // Student Comment
        if (assessmentObj.studentComment) {
          const studentComment =
            typeof assessmentObj.studentComment === "string"
              ? htmlToMarkdown(assessmentObj.studentComment)
              : String(assessmentObj.studentComment);
          if (studentComment.trim()) {
            markdown += `### Your Comment\n\n${studentComment}\n\n`;
          }
        }

        // Assessment Criteria Tabs (if any)
        if (
          assessmentObj.assessedCriteriaTabs &&
          Array.isArray(assessmentObj.assessedCriteriaTabs) &&
          assessmentObj.assessedCriteriaTabs.length > 0
        ) {
          markdown += `### Assessment Criteria\n\n`;
          (assessmentObj.assessedCriteriaTabs as Array<Record<string, unknown>>).forEach((criteria) => {
            if (criteria.name || criteria.title) {
              markdown += `**${criteria.name || criteria.title}**\n`;
            }
            if (criteria.score || criteria.grade) {
              markdown += `Score: ${criteria.score || criteria.grade}\n`;
            }
            if (criteria.comment) {
              const comment =
                typeof criteria.comment === "string" ? htmlToMarkdown(criteria.comment) : String(criteria.comment);
              markdown += `${comment}\n`;
            }
            markdown += `\n`;
          });
        }

        // Assessment Partial Moments (if any)
        if (
          assessmentObj.assessmentPartialMoments &&
          Array.isArray(assessmentObj.assessmentPartialMoments) &&
          assessmentObj.assessmentPartialMoments.length > 0
        ) {
          markdown += `### Partial Assessments\n\n`;
          (assessmentObj.assessmentPartialMoments as Array<Record<string, unknown>>).forEach((moment) => {
            if (
              moment.date &&
              (typeof moment.date === "string" || typeof moment.date === "number" || moment.date instanceof Date)
            ) {
              markdown += `**${new Date(moment.date as string | number | Date).toLocaleDateString()}**\n`;
            }
            if (moment.comment) {
              const comment =
                typeof moment.comment === "string" ? htmlToMarkdown(moment.comment) : String(moment.comment);
              markdown += `${comment}\n`;
            }
            if (moment.score || moment.grade) {
              markdown += `Score: ${moment.score || moment.grade}\n`;
            }
            markdown += `\n`;
          });
        }

        // Other fields (fallback for any other structured data)
        const knownFields = [
          "review",
          "grade",
          "score",
          "teacherComment",
          "studentComment",
          "assessedCriteriaTabs",
          "assessmentPartialMoments",
        ];
        const otherFields = Object.keys(assessmentObj).filter(
          (key) =>
            !knownFields.includes(key) &&
            assessmentObj[key] !== null &&
            assessmentObj[key] !== undefined &&
            assessmentObj[key] !== "",
        );

        if (otherFields.length > 0) {
          markdown += `### Additional Information\n\n`;
          otherFields.forEach((field) => {
            const value = assessmentObj[field];
            if (typeof value === "string" && value.trim()) {
              markdown += `**${field.charAt(0).toUpperCase() + field.slice(1)}:** ${htmlToMarkdown(value)}\n\n`;
            } else if (typeof value === "object") {
              markdown += `**${field.charAt(0).toUpperCase() + field.slice(1)}:**\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n`;
            } else if (value !== null && value !== undefined) {
              markdown += `**${field.charAt(0).toUpperCase() + field.slice(1)}:** ${value}\n\n`;
            }
          });
        }
      } else {
        markdown += `${assessment}\n`;
      }
    } else if (loadingAssessments.has(result.id)) {
      markdown += `---\n\n## Assessment Results\n\n*Loading...*\n`;
    }

    return markdown;
  }

  if (selectedResult) {
    return (
      <Detail
        markdown={formatResultDetail(selectedResult)}
        actions={
          <ActionPanel>
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={() => setSelectedResult(null)} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadResults} />
            <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search results..."
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadResults} />
          <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
        </ActionPanel>
      }
    >
      {results.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Document}
          title="No Published Results"
          description="You have no published assessment results yet."
        />
      ) : (
        results.map((result) => (
          <List.Item
            key={result.id}
            title={result.title}
            subtitle={result.subTitle || result.type}
            accessories={[
              result.endDate
                ? {
                    text: new Date(result.endDate).toLocaleDateString(),
                    icon: Icon.Calendar,
                  }
                : { text: "No date", icon: Icon.Calendar },
              assessmentData[result.id]
                ? { icon: Icon.CheckCircle, tooltip: "Results loaded" }
                : loadingAssessments.has(result.id)
                  ? { icon: Icon.Clock, tooltip: "Loading results..." }
                  : {},
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Details"
                  icon={Icon.Eye}
                  onAction={() => {
                    // Load assignment details for full description
                    loadAssignmentDetails(result.id);
                    // Ensure assessment is loaded
                    if (!assessmentData[result.id]) {
                      loadAssessmentForResult(result.id);
                    }
                    setSelectedResult(result);
                  }}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadResults} />
                <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
