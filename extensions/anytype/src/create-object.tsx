import { Toast, showToast, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { useSpaces } from "./hooks/useSpaces";
import { useTypes } from "./hooks/useTypes";
import { Type } from "./helpers/schemas";
import CreateObjectForm from "./components/CreateObjectForm";
import EnsureAuthenticated from "./components/EnsureAuthenticated";

export interface CreateObjectFormValues {
  space: string;
  type: string;
  name?: string;
  icon?: string;
  description?: string;
  body?: string;
  source?: string;
}

interface LaunchContext {
  defaults?: {
    space?: string;
    type?: string;
    name?: string;
    icon?: string;
    description?: string;
    body?: string;
    source?: string;
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

  const [selectedSpace, setSelectedSpace] = useState(mergedValues?.space || "");
  const [selectedType, setSelectedType] = useState(mergedValues?.type || "");
  const [filteredTypes, setFilteredTypes] = useState<Type[]>([]);
  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const { types, typesError, isLoadingTypes } = useTypes(selectedSpace);

  const restrictedTypes = [
    "ot-audio",
    "ot-chat",
    "ot-file",
    "ot-image",
    "ot-objectType",
    "ot-tag",
    "ot-template",
    "ot-video",
    "ot-participant",
  ];

  useEffect(() => {
    if (spaces.length > 0 && !selectedSpace) {
      setSelectedSpace(spaces[0].id);
    }
  }, [spaces]);

  useEffect(() => {
    if (types.length > 0) {
      const validTypes = types.filter((type) => !restrictedTypes.includes(type.unique_key));
      setFilteredTypes(validTypes);
    }
  }, [types]);

  useEffect(() => {
    if (filteredTypes.length > 0 && !selectedType) {
      setSelectedType(filteredTypes[0].unique_key);
    }
  }, [filteredTypes]);

  useEffect(() => {
    if (spacesError) {
      showToast(Toast.Style.Failure, "Failed to fetch spaces", spacesError.message);
    }
  }, [spacesError]);

  useEffect(() => {
    if (typesError) {
      showToast(Toast.Style.Failure, "Failed to fetch types", typesError.message);
    }
  }, [typesError]);

  return (
    <CreateObjectForm
      spaces={spaces || []}
      objectTypes={filteredTypes}
      selectedSpace={selectedSpace}
      setSelectedSpace={setSelectedSpace}
      selectedType={selectedType}
      setSelectedType={setSelectedType}
      isLoading={isLoadingSpaces || isLoadingTypes}
      draftValues={mergedValues as CreateObjectFormValues}
    />
  );
}
