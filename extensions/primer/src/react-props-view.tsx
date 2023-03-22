import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import { Component, ReactProp } from "./use-component-data";

type ReactPropsViewProps = {
  component: NonNullable<Component["implementations"]["react"]>;
  docsUrl: string;
};

export function ReactPropsView({ component, docsUrl }: ReactPropsViewProps) {
  const [filterValue, setFilterValue] = React.useState("");
  return (
    <List
      isShowingDetail
      searchBarPlaceholder={`Search ${filterValue || component.name} props...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by subcomponent"
          value={filterValue}
          onChange={(value) => setFilterValue(value)}
        >
          <List.Dropdown.Item key="all" title="All" value={""} />
          <List.Dropdown.Item
            key={component.name}
            title={component.name}
            value={component.name}
          />
          {component.subcomponents?.map((subcomponent) => (
            <List.Dropdown.Item
              key={subcomponent.name}
              title={subcomponent.name}
              value={subcomponent.name}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!filterValue || filterValue === component.name ? (
        <List.Section title={component.name}>
          {component.props.map((prop) => (
            <PropListItem key={prop.name} prop={prop} docsUrl={docsUrl} />
          ))}
        </List.Section>
      ) : null}
      {component.subcomponents
        ?.filter(
          (subcomponent) => !filterValue || filterValue === subcomponent.name
        )
        .map((subcomponent) => (
          <List.Section key={subcomponent.name} title={subcomponent.name}>
            {subcomponent.props.map((prop) => (
              <PropListItem key={prop.name} prop={prop} docsUrl={docsUrl} />
            ))}
          </List.Section>
        ))}
    </List>
  );
}

function PropListItem({ prop, docsUrl }: { prop: ReactProp; docsUrl: string }) {
  const accessories: Array<{
    text: string | { value: string; color: Color };
  }> = [];

  if (prop.required) {
    accessories.push({ text: "Required" });
  }

  if (prop.deprecated) {
    accessories.push({
      text: { value: "Deprecated", color: Color.Red },
    });
  }

  const markdown = `# ${prop.name}
	
\`\`\`typescript
${prop.type}
\`\`\`

${prop.description || ""}`;

  return (
    <List.Item
      key={prop.name}
      title={prop.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Prop Name"
            content={prop.name}
          />
          <Action.OpenInBrowser
            icon={Icon.Book}
            title="Open Documentation"
            url={docsUrl}
          />
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Default Value"
                text={{
                  value: prop.defaultValue || "n/a",
                  color: prop.defaultValue
                    ? Color.PrimaryText
                    : Color.SecondaryText,
                }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
