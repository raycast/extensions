import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { getAllFormsText, getCollocationsText, getSearchSeed, getVerbForms } from "./conjugation";

type Arguments = {
  verb?: string;
};

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [searchText, setSearchText] = useState(getSearchSeed(props.arguments.verb));
  const forms = getVerbForms(searchText);
  const allForms = getAllFormsText(forms);

  return (
    <List
      filtering={false}
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type an infinitive, e.g. go"
      searchText={searchText}
    >
      {forms.length === 0 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="Type an infinitive"
          description="Try verbs like go, write, speak, or be."
        />
      ) : (
        forms.map((form) => (
          <List.Item
            key={form.id}
            id={form.id}
            icon={form.icon}
            title={form.value}
            subtitle={form.label}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Form" content={form.value} />
                {form.collocations.length > 0 ? (
                  <Action.CopyToClipboard
                    title="Copy Common Collocations"
                    content={getCollocationsText(form.collocations)}
                  />
                ) : null}
                <Action.CopyToClipboard title="Copy All Forms" content={allForms} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={form.detail}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Form" text={form.label} />
                    <List.Item.Detail.Metadata.Label title="Usage" text={form.usage} />
                    {form.collocations.length > 0 ? (
                      <List.Item.Detail.Metadata.Label
                        title="Collocations"
                        text={`${form.collocations.length} common`}
                      />
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
