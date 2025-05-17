import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { CreateObjectFormValues } from "../create-object";
import { bundledTypeKeys, fetchAllTemplatesForSpace, fetchAllTypesForSpace } from "../utils";
import { useSearch } from "./useSearch";
import { useSpaces } from "./useSpaces";

export function useCreateObjectData(initialValues?: CreateObjectFormValues) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(initialValues?.spaceId || "");
  const [selectedTypeId, setSelectedTypeId] = useState(initialValues?.typeId || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialValues?.templateId || "");
  const [selectedListId, setSelectedListId] = useState(initialValues?.listId || "");
  const [listSearchText, setListSearchText] = useState("");
  const [objectSearchText, setObjectSearchText] = useState("");

  const { spaces, spacesError, isLoadingSpaces } = useSpaces();
  const {
    objects: lists,
    objectsError: listsError,
    isLoadingObjects: isLoadingLists,
  } = useSearch(selectedSpaceId, listSearchText, [bundledTypeKeys.collection]);

  const restrictedTypes = [
    bundledTypeKeys.audio,
    bundledTypeKeys.chat,
    bundledTypeKeys.file,
    bundledTypeKeys.image,
    bundledTypeKeys.object_type,
    bundledTypeKeys.tag,
    bundledTypeKeys.template,
    bundledTypeKeys.video,
    bundledTypeKeys.participant,
  ];

  const {
    data: allTypes,
    error: typesError,
    isLoading: isLoadingTypes,
  } = useCachedPromise(fetchAllTypesForSpace, [selectedSpaceId], { execute: !!selectedSpaceId });

  const types = useMemo(() => {
    if (!allTypes) return [];
    return allTypes.filter((type) => !restrictedTypes.includes(type.key));
  }, [allTypes, restrictedTypes]);

  const {
    data: templates,
    error: templatesError,
    isLoading: isLoadingTemplates,
  } = useCachedPromise(fetchAllTemplatesForSpace, [selectedSpaceId, selectedTypeId], {
    execute: !!selectedSpaceId && !!selectedTypeId,
    initialData: [],
  });

  const { objects, objectsError, isLoadingObjects } = useSearch(selectedSpaceId, objectSearchText, []);

  useEffect(() => {
    if (spacesError || typesError || templatesError || listsError || objectsError) {
      showFailureToast(spacesError || typesError || templatesError || listsError || objectsError, {
        title: "Failed to fetch latest data",
      });
    }
  }, [spacesError, typesError, templatesError, listsError]);

  const isLoading = isLoadingSpaces || isLoadingTypes || isLoadingTemplates || isLoadingLists || isLoadingObjects;

  return {
    spaces,
    types,
    templates,
    lists,
    objects,
    selectedSpaceId,
    setSelectedSpaceId,
    selectedTypeId,
    setSelectedTypeId,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedListId,
    setSelectedListId,
    listSearchText,
    setListSearchText,
    objectSearchText,
    setObjectSearchText,
    isLoading,
  };
}
