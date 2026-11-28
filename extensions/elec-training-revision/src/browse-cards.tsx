import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { questions, sources, topics } from "./data/questions";
import { LearningLink } from "./components/shared";

export default function Command() {
  const [topic, setTopic] = useState("all");
  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search formulas, topics, or worked examples…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by topic" value={topic} onChange={setTopic}>
          <List.Dropdown.Item title="All Topics" value="all" />
          {topics.map((t) => (
            <List.Dropdown.Item key={t} title={t} value={t} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No matching revision cards"
        description="Try another topic or search term."
        icon={Icon.MagnifyingGlass}
      />
      {questions
        .filter((q) => topic === "all" || q.topic === topic)
        .map((q) => (
          <List.Item
            key={q.id}
            title={q.concept}
            keywords={[q.topic, q.prompt, q.explanation]}
            icon={Icon.Document}
            detail={
              <List.Item.Detail
                markdown={`# ${q.concept}\n\n**${q.topic}**\n\n## Worked example\n\n${q.prompt}\n\n**Answer: ${q.options[q.answer]}**\n\n${q.explanation}\n\n## Read further\n\n[${sources[q.source].title}](${sources[q.source].url})\n\n[Explore electrical training with Elec Training](https://elec.training/)\n\nThese examples assume ideal, steady-state DC circuits. They are learning exercises, not installation or circuit design guidance.`}
              />
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Worked Example" content={`${q.prompt}\n${q.explanation}`} />
                <Action.OpenInBrowser title="Read Source Explanation" url={sources[q.source].url} />
                <LearningLink />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
