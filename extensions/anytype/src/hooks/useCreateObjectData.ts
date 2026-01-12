import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { CreateObjectFormValues } from "../components";
import { bundledTypeKeys, fetchAllTemplatesForSpace, fetchAllTypesForSpace, memberMatchesSearch } from "../utils";
import { useMembers } from "./useMembers";
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
  const { members, membersError, isLoadingMembers } = useMembers(selectedSpaceId, objectSearchText);

  const filteredMembers = useMemo(() => {
    return members.filter((member) => memberMatchesSearch(member, objectSearchText));
  }, [members, objectSearchText]);

  const combinedObjects = useMemo(() => {
    return [...(objects || []), ...filteredMembers];
  }, [objects, filteredMembers]);

  useEffect(() => {
    if (spacesError || typesError || templatesError || listsError || objectsError || membersError) {
      showFailureToast(spacesError || typesError || templatesError || listsError || objectsError || membersError, {
        title: "Failed to fetch latest data",
      });
    }
  }, [spacesError, typesError, templatesError, listsError, objectsError, membersError]);

  const isLoadingData =
    isLoadingSpaces || isLoadingTypes || isLoadingTemplates || isLoadingLists || isLoadingObjects || isLoadingMembers;

  return {
    spaces,
    types,
    templates,
    lists,
    objects: combinedObjects,
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
    isLoadingData,
  };
}
