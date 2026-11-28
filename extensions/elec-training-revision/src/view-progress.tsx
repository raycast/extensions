import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { questions, topics } from "./data/questions";
import { summarize } from "./lib/progress";
import { useProgress } from "./lib/use-progress";
import { LearningLink, ProgressError, ResetProgress } from "./components/shared";

export default function Command() {
  const store = useProgress();
  if (store.error) return <ProgressError error={store.error} reload={store.reload} reset={store.reset} />;
  const stats = summarize(store.progress);
  const lines = topics.map((topic) => {
    const pool = questions.filter((q) => q.topic === topic);
    const s = summarize(store.progress, pool);
    return `| ${topic} | ${s.seen}/${pool.length} | ${s.attempts ? `${s.accuracy}%` : "—"} | ${s.missed} |`;
  });
  const missed = questions.filter((q) => store.progress.questions[q.id]?.lastCorrect === false);
  const markdown = `# Revision progress\n\n${stats.attempts ? `**${stats.seen} of ${questions.length} questions tried** · **${stats.attempts} answers submitted** · **${stats.accuracy}% accuracy**\n\nAccuracy includes every submitted answer, including repeated attempts.` : "You have not answered any questions yet. Open Start Revision Quiz to begin."}\n\n## By topic\n\n| Topic | Tried | Accuracy | To revisit |\n| --- | --- | --- | --- |\n${lines.join("\n")}\n\n## Questions to revisit\n\n${missed.length ? missed.map((q) => `- ${q.concept}`).join("\n") : "No questions currently need revisiting."}\n\nA question leaves this list when your latest answer is correct. This is a practice history, not a qualification or assessment result.\n\nAll progress is stored locally. No answers are sent to Elec Training.\n\n[Explore Elec Training](https://elec.training/)`;
  return (
    <Detail
      isLoading={store.loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh Progress" icon={Icon.ArrowClockwise} onAction={store.reload} />
          <LearningLink />
          <ResetProgress reset={store.reset} />
        </ActionPanel>
      }
    />
  );
}
