import { List, Icon } from "@raycast/api";
import { useMemo } from "react";
import { executeAllTemplateGroups, TemplateResult } from "./template-executor";
import { TemplateGroup, ParseResult } from "../types";
import { TemplateVariantsView } from "./template-variants-view";

interface VariantsWrapperProps {
  url: string;
  templateGroups: TemplateGroup[];
  onSave?: (parsed: ParseResult) => void;
}

/**
 * Wrapper component that lazily executes templates only when rendered
 */
function VariantsWrapper({ url, templateGroups, onSave }: VariantsWrapperProps) {
  const { results, error } = useMemo(() => {
    try {
      const results = executeAllTemplateGroups(templateGroups, url);
      return { results, error: null };
    } catch (e) {
      return { results: [] as TemplateResult[], error: e };
    }
  }, [url, templateGroups]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Generating Variants"
          description={error instanceof Error ? error.message : "Unknown error occurred"}
        />
      </List>
    );
  }

  if (results.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Variants Generated"
          description="No enabled template groups found. Please enable at least one template group in Template Manager."
        />
      </List>
    );
  }

  return <TemplateVariantsView results={results} originalUrl={url} onSave={onSave} />;
}

/**
 * Creates a lazy-loading variants view component
 * Template execution only happens when the component is actually rendered (navigated to)
 */
export function createVariantsView(
  url: string,
  templateGroups: TemplateGroup[],
  onSave?: (parsed: ParseResult) => void,
) {
  return <VariantsWrapper url={url} templateGroups={templateGroups} onSave={onSave} />;
}
