import { LocalStorage } from "@raycast/api";

export interface AppInfo {
  name: string;
  path: string;
  bundleId?: string;
  /** true quando o app foi adicionado manualmente (jogo, link de launcher, etc.) */
  isCustom?: boolean;
  /** Caminho local ou URL de uma imagem para usar como ícone (usado quando não dá pra extrair o ícone do executável, ex: jogos via URI de launcher). */
  icon?: string;
}

export interface CategoryMap {
  [categoryName: string]: AppInfo[];
}

const STORAGE_KEY = "app-categories";
const CUSTOM_APPS_KEY = "custom-apps";

/** Retorna os apps adicionados manualmente pelo usuário (jogos, links de launcher, etc.) */
export async function getCustomApps(): Promise<AppInfo[]> {
  const raw = await LocalStorage.getItem<string>(CUSTOM_APPS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AppInfo[];
  } catch {
    return [];
  }
}

/** Adiciona um app personalizado à lista (evita duplicar pelo path). */
export async function addCustomApp(app: AppInfo): Promise<void> {
  const apps = await getCustomApps();
  const filtered = apps.filter((a) => a.path !== app.path);
  filtered.push({ ...app, isCustom: true });
  await LocalStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(filtered));
}

/** Remove um app personalizado da lista global (não remove automaticamente das categorias). */
export async function removeCustomApp(path: string): Promise<void> {
  const apps = await getCustomApps();
  const filtered = apps.filter((a) => a.path !== path);
  await LocalStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(filtered));
}

/** Retorna todas as categorias salvas. */
export async function getCategories(): Promise<CategoryMap> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CategoryMap;
  } catch {
    return {};
  }
}

/** Sobrescreve o mapa inteiro de categorias. */
export async function saveCategories(categories: CategoryMap): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

/** Cria uma categoria nova ou substitui a lista de apps de uma existente. */
export async function createOrUpdateCategory(
  name: string,
  apps: AppInfo[],
): Promise<void> {
  const categories = await getCategories();
  categories[name] = apps;
  await saveCategories(categories);
}

/** Remove uma categoria. */
export async function deleteCategory(name: string): Promise<void> {
  const categories = await getCategories();
  delete categories[name];
  await saveCategories(categories);
}

/** Renomeia uma categoria, preservando os apps associados. */
export async function renameCategory(
  oldName: string,
  newName: string,
): Promise<void> {
  if (oldName === newName) return;
  const categories = await getCategories();
  if (categories[oldName]) {
    categories[newName] = categories[oldName];
    delete categories[oldName];
    await saveCategories(categories);
  }
}
