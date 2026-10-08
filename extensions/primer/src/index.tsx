import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { ReactPropsView } from "./react-props-view";
import { useComponentData } from "./use-component-data";

const statusColors: Record<string, Color> = {
  alpha: Color.Orange,
  beta: Color.Yellow,
  stable: Color.Green,
  deprecated: Color.Red,
};

export default function Command() {
  const { isLoading, components } = useComponentData();
  const { push } = useNavigation();
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
                  <ActionPanel.Section title="React">
                    <Action.OpenInBrowser
                      icon={Icon.Book}
                      title="Open React Documentation"
                      url={`https://primer.style/design/components/${component.id}/react`}
                    />
                    <Action.CopyToClipboard
                      icon={Icon.Clipboard}
                      title="Copy React Component Name"
                      content={component.implementations.react.name}
                    />
                    <Action.OpenInBrowser
                      icon={Icon.Document}
                      title="Open React Source Code"
                      url={`https://github.com/primer/react/blob/main/src/${component.implementations.react.name}`}
                    />
                    <Action
                      icon={Icon.List}
                      title="View React Props"
                      onAction={() =>
                        push(
                          <ReactPropsView
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We know this is defined because of the conditional above
                            component={component.implementations.react!}
                            docsUrl={`https://primer.style/design/components/${component.id}/react#props`}
                          />
                        )
                      }
                    />
                  </ActionPanel.Section>
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
