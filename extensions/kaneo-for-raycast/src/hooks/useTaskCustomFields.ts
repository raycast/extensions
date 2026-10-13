import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { KaneoAPI } from "../api/kaneo";
import { formatCustomFieldValue, sortCustomFields } from "../lib/custom-field-helpers";

export interface TaskCustomFieldDisplay {
  id: string;
  name: string;
  /** undefined si la tâche n'a pas de valeur pour ce champ */
  text: string | undefined;
}

export function useTaskCustomFields(taskId: string, projectId: string) {
  const api = new KaneoAPI();

  const {
    data: values = [],
    isLoading: isLoadingValues,
    revalidate: revalidateValues,
  } = usePromise((id: string) => api.getTaskCustomFieldValues(id), [taskId], {
    onError: (e) => console.error("Kaneo: failed to load task custom field values", e),
  });

  const {
    data: definitions = [],
    isLoading: isLoadingDefinitions,
    revalidate: revalidateDefinitions,
  } = usePromise((id: string) => api.getCustomFields(id), [projectId], {
    onError: (e) => console.error("Kaneo: failed to load custom fields", e),
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
      text: formatCustomFieldValue(field, valueByField.get(field.id)?.value),
    }));
  }, [values, definitions]);

  return {
    fields,
    isLoading: isLoadingValues || isLoadingDefinitions,
    revalidate: () => Promise.all([revalidateValues(), revalidateDefinitions()]),
  };
}
