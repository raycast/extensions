import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { CreateObjectFormValues } from "../create-object";
import { fetchAllTemplatesForSpace, fetchAllTypesForSpace } from "../utils";
import { useSearch } from "./useSearch";
import { useSpaces } from "./useSpaces";

export function useCreateObjectData(initialValues?: CreateObjectFormValues) {
  const [selectedSpace, setSelectedSpace] = useState(initialValues?.space || "");
  const [selectedType, setSelectedType] = useState(initialValues?.type || "");
  const [selectedTemplate, setSelectedTemplate] = useState(initialValues?.template || "");
  const [selectedList, setSelectedList] = useState(initialValues?.list || "");
  const [listSearchText, setListSearchText] = useState("");

  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const {
    objects: lists,
    objectsError: listsError,
    isLoadingObjects: isLoadingLists,
  } = useSearch(selectedSpace, listSearchText, ["ot-collection"]);

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

  const {
    data: allTypes,
    error: typesError,
    isLoading: isLoadingTypes,
  } = useCachedPromise(fetchAllTypesForSpace, [selectedSpace], { execute: !!selectedSpace });

  const types = useMemo(() => {
    if (!allTypes) return [];
    return allTypes.filter((type) => !restrictedTypes.includes(type.key));
  }, [allTypes, restrictedTypes]);

  const {
    data: templates,
    error: templatesError,
    isLoading: isLoadingTemplates,
  } = useCachedPromise(fetchAllTemplatesForSpace, [selectedSpace, selectedType], {
    execute: !!selectedSpace && !!selectedType,
    initialData: [],
  });

  useEffect(() => {
    if (spacesError || typesError || templatesError || listsError) {
      showToast(
        Toast.Style.Failure,
        "Failed to fetch latest data",
        spacesError?.message || typesError?.message || templatesError?.message || listsError?.message,
      );
    }
  }, [spacesError, typesError, templatesError, listsError]);

  const isLoading = isLoadingSpaces || isLoadingTypes || isLoadingTemplates || isLoadingLists;

  return {
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
  };
}
