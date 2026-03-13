import { useEffect, useState } from "react";
import { FormValues, Template } from "../types";
import { templateService } from "../services/templateService";

export const useTemplate = () => {
  const { defaultTemplate, load, save, remove, removeAll } = templateService;
  const [templates, setTemplates] = useState([defaultTemplate]);
  const [formValues, setFormValues] = useState<FormValues>({ ...defaultTemplate });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none");

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      const loaded = await load();
      setTemplates([defaultTemplate, ...loaded]);
    };
    loadTemplates();
  }, []);

  // Helper to update state and persist
  const saveTemplates = async (updater: (prev: Template[]) => Template[]) => {
    const updatedTemplates = updater(templates);
    await save(updatedTemplates);
    setTemplates([defaultTemplate, ...updatedTemplates.filter((t) => t.id !== "none")]);
  };

  // Add a new template
  const addTemplate = async (title: string, values: FormValues): Promise<string> => {
    const id = new Date().getTime().toString();
    const newTemplate: Template = { ...values, title, id };
    await saveTemplates((prev) => [...prev, newTemplate]);
    setSelectedTemplateId(id);
    return id;
  };

  // Update existing template
  const updateTemplate = async (id: string, title: string, values: FormValues) => {
    const updatedTemplate: Template = { ...values, title, id };
    await saveTemplates((prev) => prev.map((t) => (t.id === id ? updatedTemplate : t)));
  };

  // Remove template
  const deleteTemplate = async () => {
    const targetId = selectedTemplateId;
    if (!targetId || targetId === "none") return;
    await remove(targetId);
    setTemplates((prev) => prev.filter((t) => t.id !== targetId));
    setSelectedTemplateId("none");
    resetFormValues();
  };

  // Delete all templates
  const deleteAllTemplates = async () => {
    await removeAll();
    setTemplates([defaultTemplate]);
    setSelectedTemplateId("none");
    setFormValues(defaultTemplate);
  };

  // Open a template (load into form)
  const openTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) {
      setSelectedTemplateId("none");
      setFormValues(defaultTemplate);
      return;
    }
    setSelectedTemplateId(id);
    setFormValues(template);
  };

  // Reset form values
  const resetFormValues = () => {
    setFormValues(defaultTemplate);
  };

  // Handle form fields change
  const handleChange = (field: keyof FormValues, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  return {
    templates,
    formValues,
    selectedTemplateId,
    setSelectedTemplateId,
    setFormValues,
    handleChange,
    openTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    resetFormValues,
    deleteAllTemplates,
  };
};
