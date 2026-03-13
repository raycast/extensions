import { writeFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { dirname, join, basename, extname } from "path";

export type FileType = "component" | "page" | "api" | "layout" | "composable";

export interface TemplateInfo {
  name: string;
  label: string;
  isDefault: boolean;
  isCustom: boolean;
}

const TEMPLATE_CONFIG: Record<FileType, { folder: string; extension: string }> = {
  component: { folder: "components", extension: ".vue" },
  page: { folder: "pages", extension: ".vue" },
  api: { folder: "api", extension: ".ts" },
  layout: { folder: "layouts", extension: ".vue" },
  composable: { folder: "composables", extension: ".ts" },
};

export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Returns all available templates for a given file type.
 * Includes the built-in "default" template plus any custom templates found.
 */
export function getAvailableTemplates(type: FileType, customTemplatesPath?: string): TemplateInfo[] {
  const templates: TemplateInfo[] = [
    {
      name: "default",
      label: "Default",
      isDefault: true,
      isCustom: false,
    },
  ];

  if (!customTemplatesPath) return templates;

  const config = TEMPLATE_CONFIG[type];
  const templatesDir = join(customTemplatesPath, config.folder);

  if (!existsSync(templatesDir)) return templates;

  try {
    const files = readdirSync(templatesDir);
    for (const file of files) {
      if (extname(file) === config.extension) {
        const templateName = basename(file, config.extension);

        if (templateName === "default") {
          // Replace the default template entry to mark it as custom
          templates[0] = {
            name: "default",
            label: "Default (Custom)",
            isDefault: true,
            isCustom: true,
          };
        } else {
          templates.push({
            name: templateName,
            label: toPascalCase(templateName),
            isDefault: false,
            isCustom: true,
          });
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return templates;
}

/**
 * Attempts to load a custom template from the user's custom templates directory.
 * Returns the template content if found, undefined otherwise.
 */
export function getCustomTemplateContent(
  type: FileType,
  templateName: string,
  customTemplatesPath?: string,
): string | undefined {
  if (!customTemplatesPath) return undefined;

  const config = TEMPLATE_CONFIG[type];
  const templatePath = join(customTemplatesPath, config.folder, `${templateName}${config.extension}`);

  if (existsSync(templatePath)) {
    return readFileSync(templatePath, "utf8");
  }

  return undefined;
}

function getDefaultComponentTemplate(name: string): string {
  return `<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
}>(), {
  title: '${toPascalCase(name)}',
})
</script>

<template>
  <div>
    <h1>{{ title }}</h1>
  </div>
</template>

<style scoped>
/* Add your styles here */
</style>
`;
}

function getDefaultPageTemplate(name: string): string {
  return `<script setup lang="ts">
// Add your page logic here
</script>

<template>
  <div>
    <h1>${toPascalCase(name)}</h1>
  </div>
</template>

<style scoped>
/* Add your page styles here */
</style>
`;
}

function getDefaultApiTemplate(name: string): string {
  const routeName = toKebabCase(name);
  return `export default defineEventHandler(async (event) => {
  // const query = getQuery(event)

  // const body = await readBody(event)

  return {
    message: 'Hello from ${routeName} API',
    data: {},
  }
})
`;
}

function getDefaultLayoutTemplate(): string {
  return `<script setup lang="ts">
// Add your layout logic here
</script>

<template>
  <div>
    <slot />
  </div>
</template>

<style scoped>
/* Add your layout styles here */
</style>
`;
}

function getDefaultComposableTemplate(composableName: string): string {
  return `export const ${composableName} = () => {
  const state = ref<string>('')

  const doSomething = () => {
    // Add your logic here
  }

  return {
    state,
    doSomething,
  }
}
`;
}

export function generateComponent(
  projectPath: string,
  name: string,
  customTemplatesPath?: string,
  templateName: string = "default",
): string {
  const componentName = toPascalCase(name);
  const filePath = `${projectPath}/app/components/${componentName}.vue`;

  if (existsSync(filePath)) {
    throw new Error(`Component ${componentName} already exists`);
  }

  const template =
    getCustomTemplateContent("component", templateName, customTemplatesPath) ?? getDefaultComponentTemplate(name);

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generatePage(
  projectPath: string,
  name: string,
  customTemplatesPath?: string,
  templateName: string = "default",
): string {
  const pageName = toKebabCase(name);
  const filePath = `${projectPath}/app/pages/${pageName}.vue`;

  if (existsSync(filePath)) {
    throw new Error(`Page ${pageName} already exists`);
  }

  const template = getCustomTemplateContent("page", templateName, customTemplatesPath) ?? getDefaultPageTemplate(name);

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generateApiRoute(
  projectPath: string,
  name: string,
  customTemplatesPath?: string,
  templateName: string = "default",
): string {
  const routeName = toKebabCase(name);
  const filePath = `${projectPath}/server/api/${routeName}.ts`;

  if (existsSync(filePath)) {
    throw new Error(`API route ${routeName} already exists`);
  }

  const template = getCustomTemplateContent("api", templateName, customTemplatesPath) ?? getDefaultApiTemplate(name);

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generateLayout(
  projectPath: string,
  name: string,
  customTemplatesPath?: string,
  templateName: string = "default",
): string {
  const layoutName = toKebabCase(name);
  const filePath = `${projectPath}/app/layouts/${layoutName}.vue`;

  if (existsSync(filePath)) {
    throw new Error(`Layout ${layoutName} already exists`);
  }

  const template = getCustomTemplateContent("layout", templateName, customTemplatesPath) ?? getDefaultLayoutTemplate();

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generateComposable(
  projectPath: string,
  name: string,
  customTemplatesPath?: string,
  templateName: string = "default",
): string {
  const cleanName = name.replace(/^use/i, "");
  const composableName = `use${toPascalCase(cleanName)}`;
  const filePath = `${projectPath}/app/composables/${composableName}.ts`;

  if (existsSync(filePath)) {
    throw new Error(`Composable ${composableName} already exists`);
  }

  const template =
    getCustomTemplateContent("composable", templateName, customTemplatesPath) ??
    getDefaultComposableTemplate(composableName);

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}
