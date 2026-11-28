import { Action, ActionPanel, Color, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { Question, questions, sources } from "../data/questions";
import { makeSession } from "../lib/progress";
import { LearningLink } from "./shared";

interface QuizProps {
  pool: readonly Question[];
  saveAnswer: (question: Question, selected: number) => Promise<boolean>;
}

export function Quiz({ pool, saveAnswer }: QuizProps) {
  const { pop } = useNavigation();
  const [session, setSession] = useState(() => makeSession(pool));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const answerLock = useRef(false);

  function restart() {
    setSession(makeSession(questions));
    setIndex(0);
    setSelected(undefined);
    setScore(0);
    answerLock.current = false;
  }

  if (index >= session.length) {
    return (
      <Detail
        markdown={`# Session complete\n\n## ${score} / ${session.length} correct\n\n${score === session.length ? "Great work. Try a new topic or another mixed session." : "Each answer has been saved. Use Review Mistakes to practice questions whose most recent answer was incorrect."}\n\nYour progress stays on this device.\n\nContinue your learning with [Elec Training](https://elec.training/).`}
        actions={
          <ActionPanel>
            <Action title="Choose Another Topic" icon={Icon.Book} onAction={pop} />
            <Action title="Try Mixed Practice" icon={Icon.Play} onAction={restart} />
            <LearningLink />
          </ActionPanel>
        }
      />
    );
  }

  const question = session[index];
  const source = sources[question.source];
  const answered = selected !== undefined;
  const markdown = `# ${question.prompt}\n\n${answered ? `## ${selected === question.answer ? "Correct" : "Keep practicing"}\n\n**Your answer:** ${question.options[selected]}\n\n**Correct answer:** ${question.options[question.answer]}\n\n${question.explanation}\n\n[Read the concept](${source.url})` : "Select an answer, then press Return. Your first answer is saved."}\n\n---\n\nIdeal DC circuit practice for learning; not installation or circuit design guidance.`;

  async function answer(choice: number) {
    if (answerLock.current) return;
    answerLock.current = true;
    setSaving(true);
    try {
      if (await saveAnswer(question, choice)) {
        setSelected(choice);
        if (choice === question.answer) setScore((value) => value + 1);
      } else answerLock.current = false;
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (!answerLock.current) return;
    setIndex((value) => value + 1);
    setSelected(undefined);
    answerLock.current = false;
  }

  return (
    <List
      isLoading={saving}
      isShowingDetail
      searchBarPlaceholder="Choose an answer…"
      filtering={false}
      navigationTitle={`${question.topic} • ${index + 1}/${session.length}`}
    >
      {question.options.map((option, choice) => (
        <List.Item
          key={`${question.id}-${choice}`}
          title={`${String.fromCharCode(65 + choice)}. ${option}`}
          icon={
            answered
              ? {
                  source:
                    choice === question.answer
                      ? Icon.CheckCircle
                      : choice === selected
                        ? Icon.XMarkCircle
                        : Icon.Circle,
                  tintColor:
                    choice === question.answer ? Color.Green : choice === selected ? Color.Red : Color.SecondaryText,
                }
              : Icon.Circle
          }
          detail={<List.Item.Detail markdown={markdown} />}
          actions={
            <ActionPanel>
              {answered ? (
                <Action
                  title={index + 1 === session.length ? "Show Results" : "Next Question"}
                  icon={Icon.ArrowRight}
                  onAction={next}
                />
              ) : (
                <Action title="Submit Answer" icon={Icon.Check} onAction={() => answer(choice)} />
              )}
              {answered ? <Action.OpenInBrowser title="Read Source Explanation" url={source.url} /> : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
