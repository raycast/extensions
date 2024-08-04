import { Icon, List } from "@raycast/api";

export const OnboardingEmpty = () => (
  <List.EmptyView
    title="Ask anything!"
    description={
      "You do not have any assistants added yet, click ENTER to start onboarding where you can add the necessary settings."
    }
    icon={Icon.QuestionMark}
  />
);
