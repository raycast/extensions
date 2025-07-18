import React from "react";
import { useEffect, useState } from "react";
import { ActionPanel, Action, List, useNavigation, open } from "@raycast/api";
import { fetchRecentTemplates, TemplateCard } from "./api";
import { RunForm } from "./search-templates";
// import { SearchTemplates, RunForm as SearchRunForm } from "./search-templates";

export default function RunTemplate() {
  const [templates, setTemplates] = useState<TemplateCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    fetchRecentTemplates()
      .then(setTemplates)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <List searchBarPlaceholder="Error" />;
  }
  if (!templates) {
    return <List isLoading />;
  }
  return (
    <List
      searchBarPlaceholder="Select a template"
      actions={
        <ActionPanel>
          <Action
            title="Create New Template on Buenote.app"
            onAction={() => open("https://buenote.app/templates/new")}
          />
        </ActionPanel>
      }
    >
      {templates.map((tpl) => (
        <List.Item
          key={tpl.id}
          title={tpl.name}
          subtitle={tpl.description}
          actions={
            <ActionPanel>
              <Action
                title="Run"
                onAction={() =>
                  push(<RunForm templateId={tpl.id} templateName={tpl.name} />)
                }
              />
              <Action
                title="Create New Template on Buenote.app"
                onAction={() => open("https://buenote.app/templates/new")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
