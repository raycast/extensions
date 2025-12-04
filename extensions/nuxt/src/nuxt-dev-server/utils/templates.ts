import { writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

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

export function generateComponent(projectPath: string, name: string): string {
  const componentName = toPascalCase(name);
  const filePath = `${projectPath}/app/components/${componentName}.vue`;

  if (existsSync(filePath)) {
    throw new Error(`Component ${componentName} already exists`);
  }

  const template = `<script setup lang="ts">
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

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generatePage(projectPath: string, name: string): string {
  const pageName = toKebabCase(name);
  const filePath = `${projectPath}/app/pages/${pageName}.vue`;

  if (existsSync(filePath)) {
    throw new Error(`Page ${pageName} already exists`);
  }

  const template = `<script setup lang="ts">
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

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generateApiRoute(projectPath: string, name: string): string {
  const routeName = toKebabCase(name);
  const filePath = `${projectPath}/server/api/${routeName}.ts`;

  if (existsSync(filePath)) {
    throw new Error(`API route ${routeName} already exists`);
  }

  const template = `export default defineEventHandler(async (event) => {
  // const query = getQuery(event)

  // const body = await readBody(event)

  return {
    message: 'Hello from ${routeName} API',
    data: {},
  }
})
`;

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generateLayout(projectPath: string, name: string): string {
  const layoutName = toKebabCase(name);
  const filePath = `${projectPath}/app/layouts/${layoutName}.vue`;

  if (existsSync(filePath)) {
    throw new Error(`Layout ${layoutName} already exists`);
  }

  const template = `<script setup lang="ts">
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

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}

export function generateComposable(projectPath: string, name: string): string {
  const cleanName = name.replace(/^use/i, "");
  const composableName = `use${toPascalCase(cleanName)}`;
  const filePath = `${projectPath}/app/composables/${composableName}.ts`;

  if (existsSync(filePath)) {
    throw new Error(`Composable ${composableName} already exists`);
  }

  const template = `export const ${composableName} = () => {
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

  ensureDir(filePath);
  writeFileSync(filePath, template, "utf8");
  return filePath;
}
