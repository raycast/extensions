import { LocalStorage } from "@raycast/api";
import { Template, TemplateType } from "../types/template";

type Input = {
  /**
   * A unique name for the project, if not provided, the name should be randomly generated with lowercase letters and dashes
   */
  name: string;
  /**
   * The category of the project, use the getAllCategories tool to get a list of categories.
   */
  category: string;

  /**
   * The id of the template, if not provided, the id should be randomly generated with lowercase letters and dashes
   */
  id: string;

  /**
   * The type of the template, either "command" or "template"
   */
  type: TemplateType;
  /**
   * The command to run to create the template, only used if type is "command" otherwise it should be empty
   */
  command?: string;
  /**
   * The path to the template file, only used if type is "template" otherwise it should be empty
   */
  templatePath?: string;
  /**
   * Whether to automatically create a git repository, default is false
   */
  autoCreateRepo?: boolean;
  /**
   * The command to run to be run after the template is created, default is empty string
   */
  setupCommand?: string;
};

export default async function createTemplate(input: Input) {
  const name = input.name;
  const category = input.category;
  const type = input.type;
  const command = input.command;
  const templatePath = input.templatePath;
  const autoCreateRepo = input.autoCreateRepo;
  const setupCommand = input.setupCommand;
  const id = input.id;
  const templates = await LocalStorage.getItem<string>("templates");
  const templatesArray = templates ? JSON.parse(templates) : [];

  const template: Template = {
    id: id,
    name: name,
    category: category,
    type: type,
    command: command,
    templatePath: templatePath,
    autoCreateRepo: autoCreateRepo,
    setupCommand: setupCommand,
  };

  templatesArray.push(template);
  await LocalStorage.setItem("templates", JSON.stringify(templatesArray));

  return template;
}
