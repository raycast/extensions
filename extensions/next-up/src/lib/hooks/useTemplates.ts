import { useCallback, useEffect, useState, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import { ScheduleTemplate } from "../types";
import { loadTemplates, saveTemplates } from "../storage";
import { uuid } from "../utils";

export function useTemplates() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const templatesRef = useRef(templates);
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  useEffect(() => {
    loadTemplates()
      .then(setTemplates)
      .catch(() => showToast({ style: Toast.Style.Failure, title: "Failed to load templates" }))
      .finally(() => setIsLoading(false));
  }, []);

  const saveTemplate = useCallback(async (name: string, slots: ScheduleTemplate["slots"]): Promise<void> => {
    const template: ScheduleTemplate = {
      id: uuid(),
      name,
      slots,
      createdAt: new Date().toISOString(),
    };
    const updated = [...templatesRef.current, template];
    await saveTemplates(updated);
    setTemplates(updated);
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    const updated = templatesRef.current.filter((t) => t.id !== id);
    await saveTemplates(updated);
    setTemplates(updated);
  }, []);

  return { templates, isLoading, saveTemplate, deleteTemplate };
}
