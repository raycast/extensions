import { ActionPanel, Action, Icon, List } from "@raycast/api";

class CommentItem {
  prefix: string;
  title: string;
  subtitle: string;
  icon: string;

  constructor(prefix: string, title: string, subtitle: string, icon: string) {
    this.prefix = prefix;
    this.title = title;
    this.subtitle = subtitle;
    this.icon = icon;
  }
}

const listItems: CommentItem[] = [
  {
    prefix: "praise: ",
    title: "Praise",
    subtitle: "Highlight something positive",
    icon: "../assets/praise.png",
  },
  {
    prefix: "nitpick: ",
    title: "Nitpick",
    subtitle: "Trivial preference-based requests. Non-blocking by nature.",
    icon: "../assets/nitpick.png",
  },
  {
    prefix: "suggestion: ",
    title: "Suggestion",
    subtitle: "Propose improvements to the current subject, be explicit and clear.",
    icon: "../assets/suggestion.png",
  },
  {
    prefix: "issue: ",
    title: "Issue",
    subtitle: "Highlight specific problems with the subject under review. Pair with a suggestion or question.",
    icon: "../assets/issue.png",
  },
  {
    prefix: "todo: ",
    title: "Todo",
    subtitle: "Small, trivial, but necessary changes.",
    icon: "../assets/todo.png",
  },
  {
    prefix: "question: ",
    title: "Question",
    subtitle: "Ask the author for clarifications about concerns that you're unsure about.",
    icon: "../assets/question.png",
  },
  {
    prefix: "thought: ",
    title: "Thought",
    subtitle: "Ideas that popped up from reviewing. Non-blocking by nature.",
    icon: "../assets/thought.png",
  },
  {
    prefix: "chore: ",
    title: "Chore",
    subtitle: "Simple tasks that must be done before the subject can be “officially” accepted.",
    icon: "../assets/chore.png",
  },
  {
    prefix: "note: ",
    title: "Note",
    subtitle: "Always non-blocking and simply highlight something the reader should take note of.",
    icon: "../assets/note.png",
  },
  {
    prefix: "typo: ",
    title: "Typo",
    subtitle: "Like todo:, where the main issue is a mispelling.",
    icon: "../assets/typo.png",
  },
  {
    prefix: "polish: ",
    title: "Polish",
    subtitle: "Like a suggestion, where there is nothing necessarily wrong with the relevant content.",
    icon: "../assets/polish.png",
  },
];

export default function Command() {
  return (
    <List>
      {listItems.map((item, index) => (
        <List.Item
          key={index}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action.Paste content={item.prefix} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
