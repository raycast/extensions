import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { GenerationInputForm } from "./components/generation-input-form";
import { TemplateForm } from "./components/template-form";
import { TemplateRepository } from "./storage/template-repository";

const repository = new TemplateRepository();

type GenerateCardProps = {
  readonly deckId?: string;
};

export default function GenerateCard({ deckId }: GenerateCardProps = {}) {
  const { data: templates = [], error, isLoading, revalidate } = usePromise(() => repository.list(), []);
  const matchingTemplates = deckId ? templates.filter((template) => template.deckId === deckId) : templates;
  const refresh = async (): Promise<void> => {
    await revalidate();
  };

  if (deckId && !isLoading && !error && matchingTemplates.length === 1) {
    return <GenerationInputForm template={matchingTemplates[0]} />;
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={deckId ? "Create Card" : undefined}
      searchBarPlaceholder="Choose a template to create a card"
    >
      {matchingTemplates.length === 0 ? (
        <List.EmptyView
          icon={error ? Icon.Warning : Icon.Stars}
          title={error ? "Couldn't Load Templates" : deckId ? "No Templates in This Deck" : "No Templates Yet"}
          description={
            error
              ? errorMessage(error)
              : deckId
                ? "Create one for this deck in Manage Templates, then come back here."
                : "Create one in Manage Templates, then come back here to make a card."
          }
        />
      ) : (
        matchingTemplates.map((template) => {
          const canGenerate = template.output.kind === "card-body" || template.output.target.status === "configured";
          return (
            <List.Item
              key={template.id}
              icon={Icon.Snippets}
              title={template.name}
              accessories={[
                ...(!canGenerate ? [{ tag: { value: "Needs Mapping", color: "orange" } }] : []),
                { icon: Icon.Book, text: template.deckName },
              ]}
              actions={
                <ActionPanel>
                  {canGenerate ? (
                    <Action.Push
                      title="Create Card Using Template"
                      icon={Icon.NewDocument}
                      target={<GenerationInputForm template={template} />}
                    />
                  ) : null}
                  <Action.Push
                    title="Edit Template"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    target={
                      <TemplateForm repository={repository} template={template} onSaved={refresh} onDeleted={refresh} />
                    }
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
