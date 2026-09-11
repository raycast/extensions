import { ActionPanel, Action, List, getPreferenceValues, Clipboard, PreferenceValues, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { ensureQuestionsLoaded, loadQuestionsFile, loadAnswersFile } from "./storage";
import { AnswersFile, QuestionsFile } from "./types";
import { exportQuestionsAsMarkdown } from "./questions";
import AnswersCommand from "./answer-40-questions";

export default function Command() {
  const preferences = getPreferenceValues<PreferenceValues>();
  const [questionsFile, setQuestionsFile] = useState<QuestionsFile | null>(null);
  const [answers, setAnswers] = useState<AnswersFile>({});
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    const lang = preferences.language ?? "en";
    const repo = preferences.questionsRepo;
    try {
      await ensureQuestionsLoaded(lang, repo);
    } catch (e) {
      console.debug("ensureQuestionsLoaded", e);
    }
    try {
      const q = await loadQuestionsFile(lang);
      setQuestionsFile(q);
    } catch (e) {
      console.debug(e);
    }
    try {
      const a = await loadAnswersFile();
      setAnswers(a);
    } catch (e) {
      console.debug(e);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [preferences.language]);

  const years = Object.keys(answers).sort((a, b) => parseInt(b) - parseInt(a));

  const questions = questionsFile
    ? (Object.entries(questionsFile).filter(([k]) => k !== "meta") as [string, string][])
    : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Questions for ${filterYear}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Year" storeValue onChange={(value) => setFilterYear(parseInt(value))}>
          <List.Dropdown.Section title="Years">
            {years.map((dropdownYear) => (
              <List.Dropdown.Item key={dropdownYear} title={dropdownYear} value={dropdownYear} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {questions.length === 0 && (
        <List.EmptyView
          title="No questions found"
          description={
            "Ensure the questions are available for the selected language in the configured repository (" +
            preferences.questionsRepo +
            ")."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={"https://github.com/" + preferences.questionsRepo} />
            </ActionPanel>
          }
        />
      )}

      {questions.map(([k, q]) => {
        const ans = answers[filterYear] ? answers[filterYear][k] : undefined;

        return (
          <List.Item
            key={k}
            title={k + ". " + q}
            accessories={ans?.response ? [{ text: ans.response, tooltip: ans.response }] : []}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Question" content={q} />
                {ans && ans.response && <Action.CopyToClipboard title="Copy Answer" content={ans.response} />}
                <Action.Push
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  icon={Icon.Pencil}
                  target={
                    <AnswersCommand initialQuestionNumber={parseInt(k)} initialYear={filterYear} onChange={load} />
                  }
                  title={ans ? "Edit Answer" : "Answer Question"}
                />
                <ActionPanel.Section>
                  <ActionPanel.Submenu title="Share" icon={Icon.Upload} shortcut={{ modifiers: ["cmd"], key: "s" }}>
                    {ans && ans.response && (
                      <Action
                        title={`Questions and Answers for ${filterYear}`}
                        icon={Icon.SpeechBubbleActive}
                        onAction={() => {
                          const md = exportQuestionsAsMarkdown(questionsFile!, answers, filterYear);
                          Clipboard.copy(md);
                        }}
                      />
                    )}
                    <Action
                      title="Questions Only"
                      icon={Icon.QuestionMarkCircle}
                      onAction={() => {
                        const md = exportQuestionsAsMarkdown(questionsFile!);
                        Clipboard.copy(md);
                      }}
                    />
                    <Action.CopyToClipboard
                      title="All Data (JSON)"
                      content={JSON.stringify({ questions: questionsFile, answers }, null, 2)}
                    />
                  </ActionPanel.Submenu>
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
