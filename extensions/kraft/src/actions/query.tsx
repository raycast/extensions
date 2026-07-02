import { Action, ActionPanel } from "@raycast/api";
import { QueryHook } from "../hooks/useQuery";

export const QueryActionSection = ({
  query,
  langType,
  setLangType,
}: {
  query: QueryHook;
  langType: string;
  setLangType: (arg0: string) => void;
}) => (
  <ActionPanel.Section title="Query">
    {query.text && <Action title="Run AI Tool" onAction={() => query.updateQuerying(true)} />}
    <Action
      title={`Control ${langType == "To" ? "Source" : "Output"} Language`}
      onAction={() => {
        setLangType(langType == "To" ? "From" : "To");
      }}
    />
  </ActionPanel.Section>
);
