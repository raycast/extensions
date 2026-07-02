import { Icon, List } from "@raycast/api";

export const EmptyView = () => (
  <List.EmptyView
    title="Enter Text for This Tool"
    description={
      "Type text in the search bar, then press Enter.\nUse the language dropdown to control the source or output language."
    }
    icon={Icon.QuestionMark}
  />
);
