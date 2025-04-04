import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect } from "react";
import { CreateObjectForm } from ".";
import { CreateObjectFormValues } from "../create-object";
import { useCreateObjectData } from "../hooks";

type EmptyViewObjectProps = {
  title: string;
  contextValues: CreateObjectFormValues;
};

export function EmptyViewObject({ title, contextValues }: EmptyViewObjectProps) {
  const draftValues: CreateObjectFormValues = {
    space: contextValues.space,
    type: contextValues.type,
    list: contextValues.list,
    name: contextValues.name,
    icon: contextValues.icon,
    description: contextValues.description,
    body: contextValues.body,
    source: contextValues.source,
  };

  const {
    spaces,
    types,
    templates,
    lists,
    selectedSpace,
    setSelectedSpace,
    selectedType,
    setSelectedType,
    selectedTemplate,
    setSelectedTemplate,
    selectedList,
    setSelectedList,
    listSearchText,
    setListSearchText,
    isLoading,
  } = useCreateObjectData(draftValues);

  useEffect(() => {
    if (spaces.length > 0 && !selectedSpace) {
      setSelectedSpace(spaces[0].id);
    }
  }, [spaces]);

  useEffect(() => {
    if (types.length > 0 && !selectedType) {
      setSelectedType(types[0].id);
    }
  }, [types]);

  return (
    <List.EmptyView
      title={title}
      description="Create a new object by pressing ⏎"
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Object"
            target={
              <CreateObjectForm
                spaces={spaces}
                types={types}
                templates={templates}
                lists={lists}
                selectedSpace={selectedSpace}
                setSelectedSpace={setSelectedSpace}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
                selectedList={selectedList}
                setSelectedList={setSelectedList}
                listSearchText={listSearchText}
                setListSearchText={setListSearchText}
                isLoading={isLoading}
                draftValues={draftValues}
                enableDrafts={false}
              />
            }
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    />
  );
}
