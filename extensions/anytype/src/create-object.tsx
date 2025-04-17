import { LaunchProps } from "@raycast/api";
import { CreateObjectForm, EnsureAuthenticated } from "./components";
import { useCreateObjectData } from "./hooks";

export interface CreateObjectFormValues {
  space?: string;
  type?: string;
  template?: string;
  list?: string;
  name?: string;
  icon?: string;
  description?: string;
  body?: string;
  source?: string;
}

interface LaunchContext {
  defaults: {
    space: string;
    type: string;
    template: string;
    list: string;
    name: string;
    icon: string;
    description: string;
    body: string;
    source: string;
  };
}

interface CreateObjectProps
  extends LaunchProps<{ draftValues?: CreateObjectFormValues; launchContext?: LaunchContext }> {}

export default function Command(props: CreateObjectProps) {
  return (
    <EnsureAuthenticated viewType="form">
      <CreateObject {...props} />
    </EnsureAuthenticated>
  );
}

function CreateObject({ draftValues, launchContext }: CreateObjectProps) {
  const mergedValues = {
    ...launchContext?.defaults,
    ...draftValues, // `draftValues` takes precedence
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
  } = useCreateObjectData(mergedValues);

  return (
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
      draftValues={mergedValues}
      enableDrafts={true}
    />
  );
}
