import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { z } from "zod";

const statusColors: Record<string, Color> = {
  alpha: Color.Orange,
  beta: Color.Yellow,
  stable: Color.Green,
  deprecated: Color.Red,
};

const componentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.union([z.string(), z.null()]),
  implementations: z.object({
    react: z.union([
      z.object({
        status: z.string(),
        a11yReviewed: z.boolean(),
      }),
      z.null(),
    ]),
  }),
});

const componentsSchema = z.object({
  components: z.array(componentSchema),
});

export default function Command() {
  // TODO: Replace this with primer.style/design URL after merging https://github.com/primer/design/pull/425
  const { isLoading, data } = useFetch(
    "https://primer-5dd8f1e892-26441320.drafts.github.io/components.json"
  );

  const { components = [] } = data ? componentsSchema.parse(data) : {};

  return (
    <List isLoading={isLoading} isShowingDetail>
      <List.Section title="Components">
        {components.map((component) => (
          <List.Item
            key={component.id}
            title={component.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.Book}
                  title="Open Documentation"
                  url={`https://primer.style/design/components/${component.id}`}
                />
                {component.implementations.react ? (
                  <Action.OpenInBrowser
                    icon={Icon.Book}
                    title="Open React Documentation"
                    url={`https://primer.style/design/components/${component.id}/react`}
                  />
                ) : null}
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`# ${component.name}\n${component.description || ""}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    {component.implementations.react ? (
                      <>
                        <List.Item.Detail.Metadata.Label
                          title="React Implementation"
                          icon={{
                            source: Icon.Dot,
                            tintColor:
                              statusColors[
                                component.implementations.react.status
                              ] || Color.SecondaryText,
                          }}
                          text={{
                            value: sentenceCase(
                              component.implementations.react.status
                            ),
                            color:
                              statusColors[
                                component.implementations.react.status
                              ] || Color.SecondaryText,
                          }}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="React Accessibility"
                          icon={
                            component.implementations.react.a11yReviewed
                              ? {
                                  source: Icon.Check,
                                  tintColor: Color.Purple,
                                }
                              : undefined
                          }
                          text={{
                            value: component.implementations.react.a11yReviewed
                              ? "Reviewed"
                              : "Not reviewed",
                            color: component.implementations.react.a11yReviewed
                              ? Color.Purple
                              : Color.SecondaryText,
                          }}
                        />
                        {/* )} */}
                      </>
                    ) : (
                      <List.Item.Detail.Metadata.Label
                        title="React Implementation"
                        text={{
                          value: "Not available",
                          color: Color.SecondaryText,
                        }}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function sentenceCase(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}
