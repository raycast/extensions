import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { getSemesterScores, SemesterScores } from "@/data/scores/getSemesterScores";
import { useCachedPromise } from "@raycast/utils";

export default function SemesterDetail({ semCode }: { semCode: string }) {
  const { isLoading, data: rows } = useCachedPromise(getSemesterScores, [semCode], {
    initialData: null,
    onError: async () => {
      await showToast(Toast.Style.Failure, "Failed to load semester details");
    },
  });

  const semesterName = rows?.results[0]?.semester_name || "Semester";

  const createMarkdownTable = (data: SemesterScores): string => {
    const tableRows = data.results.map((r) => {
      const repeated = r.again_yn === "Y" ? "Yes" : "No";
      return `| ${r.lecture_name} | ${r.score} | ${r.total_score_new} | ${r.last_score} | ${r.total_score} | ${r.grade} | ${repeated} |`;
    });

    return `
### ${semesterName}

| Subject             | Credit | Pre-exam | Exam | Total | Grade | Repeated |
|---------------------|--------|----------|------|-------|-------|----------|
${tableRows.join("\n")}
`;
  };

  const markdownTable = rows ? createMarkdownTable(rows) : null;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdownTable}
      actions={
        rows && (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy as Markdown" content={markdownTable!} />
          </ActionPanel>
        )
      }
    />
  );
}
