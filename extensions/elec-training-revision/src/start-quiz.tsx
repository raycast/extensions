import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { questions, topics } from "./data/questions";
import { summarize } from "./lib/progress";
import { useProgress } from "./lib/use-progress";
import { LearningLink, ProgressError } from "./components/shared";
import { Quiz } from "./components/quiz";

export default function Command() {
  const store = useProgress();
  if (store.error) return <ProgressError error={store.error} reload={store.reload} reset={store.reset} />;
  if (store.loading) return <List isLoading searchBarPlaceholder="Loading revision progress…" />;
  const missed = questions.filter((q) => store.progress.questions[q.id]?.lastCorrect === false);
  return (
    <List searchBarPlaceholder="Choose a revision topic…">
      <List.Section title="Practice" subtitle="Up to 8 questions per session">
        {[
          { title: "Mixed Practice", pool: questions },
          ...topics.map((topic) => ({ title: topic, pool: questions.filter((q) => q.topic === topic) })),
        ].map(({ title, pool }) => {
          const stats = summarize(store.progress, pool);
          return (
            <List.Item
              key={title}
              title={title}
              icon={Icon.Book}
              accessories={[{ text: `${stats.seen}/${pool.length} tried` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Start Quiz"
                    icon={Icon.Play}
                    target={<Quiz pool={pool} saveAnswer={store.saveAnswer} />}
                    onPop={store.reload}
                  />
                  <LearningLink />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Revisit">
        <List.Item
          title="Review Mistakes"
          subtitle={missed.length ? `${missed.length} questions to revisit` : "No mistakes to revisit"}
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <Action.Push
                title={missed.length ? "Review Mistakes" : "Start Mixed Practice"}
                icon={missed.length ? Icon.ArrowClockwise : Icon.Play}
                target={<Quiz pool={missed.length ? missed : questions} saveAnswer={store.saveAnswer} />}
                onPop={store.reload}
              />
              <LearningLink />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
