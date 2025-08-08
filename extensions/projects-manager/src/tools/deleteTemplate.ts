import { LocalStorage, showToast, Toast } from "@raycast/api";
import getAllTemplates from "./getAllTemplates";
import { Template } from "../types/template";

type Input = {
  /**
   * The template to delete. Use the getAllTemplates tool to get a list of templates.
   */
  template: Template;
};

export default async function deleteTemplate(input: Input): Promise<boolean> {
  try {
    const existingTemplates = await getAllTemplates();
    const updatedTemplates = existingTemplates.filter((t) => t.id !== input.template.id);

    await LocalStorage.setItem("templates", JSON.stringify(updatedTemplates));

    await showToast({
      title: "Template Deleted",
      message: `${input.template.name} has been deleted successfully`,
      style: Toast.Style.Success,
    });

    return true;
  } catch (error) {
    await showToast({
      title: "Failed to Delete Template",
      message: `Could not delete ${input.template.name}`,
      style: Toast.Style.Failure,
    });

    return false;
  }
}
