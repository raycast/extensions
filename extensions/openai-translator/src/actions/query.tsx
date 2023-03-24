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
    query.text && (<Action title="Translate" onAction={() => query.updateQuerying(true)} />)
    <Action
      title={`Switch to Translate ${langType == "To" ? "From" : "To"}`}
      onAction={() => {
        setLangType(langType == "To" ? "From" : "To");
      }}
    />
  </ActionPanel.Section>
);
