import { Icon, List } from "@raycast/api";

export const EmptyView = () => (
  <List.EmptyView
    title="Ask Charming anything"
    description={
      "Enter the question, hit enter, start a new conversation;\nReturn to the root view to start a new round of conversation."
      //"输入问题，敲击回车，既可立即对话；\n输入新问题，可在同一个上下文连续对话；\n回到根视图可重新开始一轮对话"
    }
    icon={Icon.QuestionMark}
  />
);
