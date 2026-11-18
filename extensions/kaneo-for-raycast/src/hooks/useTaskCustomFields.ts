import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { KaneoAPI } from "../api/kaneo";
import { formatCustomFieldValue, sortCustomFields } from "../lib/custom-field-helpers";

export interface TaskCustomFieldDisplay {
  id: string;
  name: string;
  /** undefined si la tâche n'a pas de valeur pour ce champ */
  text: string | undefined;
  /** true si le chargement des valeurs a échoué (text n'est alors pas fiable) */
  loadFailed: boolean;
}

export function useTaskCustomFields(taskId: string, projectId: string) {
  const api = new KaneoAPI();

  const {
    data: values = [],
    isLoading: isLoadingValues,
    error: valuesError,
    revalidate: revalidateValues,
  } = usePromise((id: string) => api.getTaskCustomFieldValues(id), [taskId], {
    onError: (e) => {
      console.error("Kaneo: failed to load task custom field values", e);
      showFailureToast(e, { title: "Failed to load custom field values" });
    },
  });

  const {
    data: definitions = [],
    isLoading: isLoadingDefinitions,
    error: definitionsError,
    revalidate: revalidateDefinitions,
  } = usePromise((id: string) => api.getCustomFields(id), [projectId], {
    onError: (e) => {
      console.error("Kaneo: failed to load custom fields", e);
      showFailureToast(e, { title: "Failed to load custom fields" });
    },
  });

  const fields = useMemo<TaskCustomFieldDisplay[]>(() => {
    const valueByField = new Map(values.map((v) => [v.fieldId, v]));

    // Définitions du projet + celles éventuellement renvoyées avec les valeurs de la tâche
    const all = new Map(definitions.map((d) => [d.id, d]));
    for (const v of values) {
      if (v.field && !all.has(v.fieldId)) all.set(v.fieldId, v.field);
    }

    return sortCustomFields([...all.values()]).map((field) => ({
      id: field.id,
      name: field.name,
      text: valuesError ? undefined : formatCustomFieldValue(field, valueByField.get(field.id)?.value),
      loadFailed: Boolean(valuesError),
    }));
  }, [values, definitions, valuesError]);

  return {
    fields,
    isLoading: isLoadingValues || isLoadingDefinitions,
    valuesError,
    definitionsError,
    hasError: Boolean(valuesError || definitionsError),
    revalidate: () => Promise.all([revalidateValues(), revalidateDefinitions()]),
  };
}
