import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  confirmAlert,
} from "@raycast/api";
import React from "react";
import { Agent, PromptTemplate } from "../agents";
import { deleteTemplate, isBuiltin, mergedTemplates } from "../templates";
import { launchAgent, shellQuote } from "../vibe";
import { TemplateForm } from "./TemplateForm";

export function TemplateList({
  folder,
  agent,
  onRefresh,
}: {
  folder: { path: string; name: string };
  agent: Agent;
  onRefresh?: () => void;
}) {
  const [templates, setTemplates] = React.useState<PromptTemplate[]>([]);

  const refresh = React.useCallback(async () => {
    setTemplates(await mergedTemplates());
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const launchWith = (template: PromptTemplate) => {
    const combinedArgs = agent.args.trim()
      ? `${agent.args} ${shellQuote(template.prompt)}`
      : shellQuote(template.prompt);
    void launchAgent(folder.path, { ...agent, args: combinedArgs }).then(
      onRefresh,
    );
  };

  return (
    <List
      navigationTitle={`Launch ${agent.name} with prompt`}
      searchBarPlaceholder="Search templates…"
      actions={
        <ActionPanel>
          <Action.Push
            title="New Template"
            icon={Icon.Plus}
            target={<TemplateForm onSaved={setTemplates} />}
          />
        </ActionPanel>
      }
    >
      {templates.map((template) => {
        const builtin = isBuiltin(template.id);
        return (
          <List.Item
            key={template.id}
            icon={builtin ? Icon.Stars : Icon.TextDocument}
            title={template.title}
            subtitle={template.prompt.split("\n")[0]}
            accessories={builtin ? [{ text: "Built-in" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={`Launch ${agent.name}`}
                  icon={agent.icon}
                  onAction={() => launchWith(template)}
                />
                {!builtin ? (
                  <Action.Push
                    title="Edit Template"
                    icon={Icon.Pencil}
                    target={
                      <TemplateForm
                        template={template}
                        onSaved={setTemplates}
                      />
                    }
                  />
                ) : null}
                {!builtin ? (
                  <Action
                    title="Delete Template"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Delete this template?",
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (!confirmed) return;
                      setTemplates(await deleteTemplate(template.id));
                    }}
                  />
                ) : null}
                <Action.Push
                  title="New Template"
                  icon={Icon.Plus}
                  target={<TemplateForm onSaved={setTemplates} />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
