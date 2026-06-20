import { LocalStorage, getPreferenceValues } from "@raycast/api";

// UI strings only (never codes/shortcuts). English is the source of truth; other packs
// override by key and fall back to English. Strings use {name}-style placeholders so they
// stay translatable and JSON-serializable (for the import/export of language packs).
export type Translate = (key: string, params?: Record<string, string | number>) => string;

export const EN: Record<string, string> = {
  // Lumen — selector
  "selector.placeholder": "Type a workspace alias and press space to enter",
  "selector.empty.none.title": "No workspaces yet",
  "selector.empty.none.desc": "Create one with the Manage Workspaces command.",
  "selector.empty.nomatch.title": "No match",
  "selector.empty.nomatch.desc": "No workspace matches your search.",
  "action.enterWorkspace": "Enter Workspace",
  // Shared item actions
  "action.open": "Open",
  "action.openInFinder": "Open in Finder",
  "action.copyFolderPath": "Copy Folder Path",
  "action.copyFullPath": "Copy Full Path",
  "action.showInFinder": "Show in Finder",
  "action.quickLook": "Quick Look",
  "action.refreshIndex": "Refresh Index",
  // Scoped first level / search
  "firstLevel.placeholder": "Search in {name}",
  "firstLevel.empty.title": "Empty",
  "firstLevel.empty.desc": "This workspace's top level has no visible items.",
  "search.noresults.title": "No results",
  "search.noresults.desc": "No file matches your search.",
  // Home
  "home.nav": "Home",
  "home.placeholder": "Search your home folder (~)",
  "home.indexing": "Indexing ~…",
  "home.empty.title": "Search Home",
  "home.empty.desc": "Type a term to fuzzy-search everything under ~.",
  // Manage Workspaces
  "mw.empty.title": "No workspaces yet",
  "mw.empty.desc": "Create your first workspace to scope Lumen searches.",
  "mw.create": "Create Workspace",
  "mw.edit": "Edit Workspace",
  "mw.delete": "Delete Workspace",
  "mw.deleteConfirm": 'Delete "{name}"?',
  "mw.save": "Save Workspace",
  "mw.toast.deleted": "Workspace deleted",
  "mw.toast.created": "Workspace created",
  "mw.toast.updated": "Workspace updated",
  "form.name": "Name",
  "form.folder": "Folder",
  "form.aliases": "Aliases",
  "form.aliases.info": "Comma-separated. Lowercased on save. Must be unique across workspaces.",
  "form.number": "Number",
  "form.number.info": "Optional unique integer shortcut.",
  "err.nameRequired": "Name is required",
  "err.folderRequired": "Folder is required",
  "err.aliasRequired": "At least one alias is required",
  "err.hReserved": '"h" is reserved for Home search',
  "err.numberInteger": "Number must be an integer",
  "err.aliasUsed": 'Alias "{value}" already used by {name}',
  "err.numberUsed": 'Number "{value}" already used by {name}',
  // Manage Tools — shared
  "mt.nav": "Manage Tools",
  "common.delete": "Delete",
  "common.restore": "Restore",
  "common.defaultsRestored": "Defaults restored",
  // Manage Tools — categories
  "mt.cat.section": "Categories",
  "mt.cat.section.sub": "Filter files by type with -code",
  "mt.cat.edit": "Edit Category",
  "mt.cat.create": "Create Category",
  "mt.cat.delete": "Delete Category",
  "mt.cat.deleteConfirm": 'Delete category "{name}"?',
  "mt.cat.save": "Save Category",
  "mt.cat.restore": "Restore Default Categories",
  "mt.cat.restoreConfirm.title": "Restore default categories?",
  "mt.cat.restoreConfirm.msg": "Replaces all categories with the built-in defaults.",
  "mt.cat.toast.deleted": "Category deleted",
  "mt.cat.toast.created": "Category created",
  "mt.cat.toast.updated": "Category updated",
  "form.code": "Code",
  "form.cat.codeInfo": "Typed after a dash, e.g. -d. Must be unique.",
  "form.extensions": "Extensions",
  "form.extensions.info": "Comma-separated. Dots optional, lowercased on save.",
  "err.codeRequired": "Code is required",
  "err.extRequired": "At least one extension is required",
  "err.catCodeUsed": 'Code "-{code}" already used by {name}',
  // Manage Tools — order tools
  "mt.tool.section": "Order Tools",
  "mt.tool.section.sub": "Sort/filter results with --code",
  "mt.tool.edit": "Edit Tool",
  "mt.tool.enable": "Enable Tool",
  "mt.tool.disable": "Disable Tool",
  "mt.tool.restore": "Restore Default Tools",
  "mt.tool.save": "Save Tool",
  "mt.tool.restoreConfirm.title": "Restore default tools?",
  "mt.tool.restoreConfirm.msg": "Resets every order tool's code and enabled state.",
  "mt.tool.on": "On",
  "mt.tool.off": "Off",
  "mt.tool.toast.updated": "Tool updated",
  "form.tool.desc": "{label} — sorts results by this field.",
  "form.tool.codeInfo": "Typed after a double dash, e.g. --dc. Must be unique.",
  "form.enabled": "Enabled",
  "err.toolCodeUsed": 'Code "--{code}" already used by {label}',
  // Manage Tools — date filters
  "mt.date.section": "Date Filters",
  "mt.date.section.sub": "Args for --dc/--dm (e.g. --dc,month or --dc,mar,2024)",
  "mt.date.edit": "Edit Date Filter",
  "mt.date.restore": "Restore Default Date Filters",
  "mt.date.save": "Save Date Filter",
  "mt.date.restoreConfirm.title": "Restore default date filters?",
  "mt.date.restoreConfirm.msg": "Resets every date filter code (today/week/month/year and jan…dec).",
  "mt.date.kind.month": "Month",
  "mt.date.kind.window": "Window",
  "mt.date.toast.updated": "Date filter updated",
  "form.date.desc": "{label} — used as a --dc/--dm argument.",
  "form.date.codeInfo": "Typed after a date command, e.g. --dc,today. Must be unique; can't be 4 digits.",
  "err.qualFourDigits": "A 4-digit code clashes with year filtering",
  "err.qualCodeUsed": 'Code "{code}" already used by {label}',
  // Manage Tools — language
  "mt.lang.section": "Language",
  "mt.lang.section.sub": "UI language is set in the extension preferences",
  "mt.lang.exportTemplate": "Export Language Template",
  "mt.lang.import": "Import Language…",
  "mt.lang.templateSaved": "Template saved",
  "mt.lang.imported": "Language imported — set Language to Custom in preferences",
  "mt.lang.importInvalid": "Invalid language JSON",
  "mt.lang.current": "Active: {lang}",
  "mt.lang.importDesc":
    "Pick a translated JSON (same keys as the template). Then choose Custom in the extension's Language preference.",
  // About
  "about.nav": "About Lumen",
  "about.openGithub": "Open GitHub Profile",
  "about.find": "Find Anything",
  "about.subheader": "Open source · Local-first · Keyboard oriented\n\nNo subscriptions · No telemetry · No bullshit",
  "about.madeBy": "Made by Páramo Studio",
  "about.checkProjects": "Check my other projects on GitHub →",
  // Export / Import
  "ex.title": "Export Configuration",
  "ex.copy": "Copy JSON",
  "ex.save": "Save to Downloads",
  "ex.import": "Import from File…",
  "ex.saved": "Saved",
  "ex.imported": "Imported",
  "ex.importPick": "Pick a file",
  "ex.importInvalid": "Invalid JSON",
  "ex.importNothing": "Nothing recognizable to import",
  "ex.importConfirm.title": "Replace your Lumen configuration?",
  "ex.importConfirm.msg": "Overwrites your {sections} with the file contents.",
  "ex.importAction": "Import (Replace)",
  "ex.fileTitle": "JSON File",
  "ex.importFormDesc":
    "Import REPLACES your current Lumen config (workspaces, categories, tools, date filters) with whatever sections the file contains.",
};

const ES: Record<string, string> = {
  "selector.placeholder": "Escribe el alias de tu ruta y pulsa espacio para entrar",
  "selector.empty.none.title": "Aún no hay workspaces",
  "selector.empty.none.desc": "Crea uno con el comando Manage Workspaces.",
  "selector.empty.nomatch.title": "Sin coincidencias",
  "selector.empty.nomatch.desc": "Ningún workspace coincide con tu búsqueda.",
  "action.enterWorkspace": "Entrar al workspace",
  "action.open": "Abrir",
  "action.openInFinder": "Abrir en Finder",
  "action.copyFolderPath": "Copiar ruta de la carpeta",
  "action.copyFullPath": "Copiar ruta completa",
  "action.showInFinder": "Mostrar en Finder",
  "action.quickLook": "Vista rápida",
  "action.refreshIndex": "Recargar índice",
  "firstLevel.placeholder": "Buscar en {name}",
  "firstLevel.empty.title": "Vacío",
  "firstLevel.empty.desc": "El primer nivel de este workspace no tiene elementos visibles.",
  "search.noresults.title": "Sin resultados",
  "search.noresults.desc": "Ningún archivo coincide con tu búsqueda.",
  "home.nav": "Home",
  "home.placeholder": "Busca en tu carpeta de usuario (~)",
  "home.indexing": "Indexando ~…",
  "home.empty.title": "Buscar en Home",
  "home.empty.desc": "Escribe un término para buscar en todo lo que hay bajo ~.",
  "mw.empty.title": "Aún no hay workspaces",
  "mw.empty.desc": "Crea tu primer workspace para acotar las búsquedas de Lumen.",
  "mw.create": "Crear workspace",
  "mw.edit": "Editar workspace",
  "mw.delete": "Borrar workspace",
  "mw.deleteConfirm": '¿Borrar "{name}"?',
  "mw.save": "Guardar workspace",
  "mw.toast.deleted": "Workspace borrado",
  "mw.toast.created": "Workspace creado",
  "mw.toast.updated": "Workspace actualizado",
  "form.name": "Nombre",
  "form.folder": "Carpeta",
  "form.aliases": "Alias",
  "form.aliases.info": "Separados por comas. Se pasan a minúsculas al guardar. Únicos entre workspaces.",
  "form.number": "Número",
  "form.number.info": "Atajo numérico opcional y único.",
  "err.nameRequired": "El nombre es obligatorio",
  "err.folderRequired": "La carpeta es obligatoria",
  "err.aliasRequired": "Hace falta al menos un alias",
  "err.hReserved": '"h" está reservado para la búsqueda en Home',
  "err.numberInteger": "El número debe ser entero",
  "err.aliasUsed": 'El alias "{value}" ya lo usa {name}',
  "err.numberUsed": 'El número "{value}" ya lo usa {name}',
  "mt.nav": "Manage Tools",
  "common.delete": "Borrar",
  "common.restore": "Restaurar",
  "common.defaultsRestored": "Valores por defecto restaurados",
  "mt.cat.section": "Categorías",
  "mt.cat.section.sub": "Filtra archivos por tipo con -código",
  "mt.cat.edit": "Editar categoría",
  "mt.cat.create": "Crear categoría",
  "mt.cat.delete": "Borrar categoría",
  "mt.cat.deleteConfirm": '¿Borrar la categoría "{name}"?',
  "mt.cat.save": "Guardar categoría",
  "mt.cat.restore": "Restaurar categorías por defecto",
  "mt.cat.restoreConfirm.title": "¿Restaurar las categorías por defecto?",
  "mt.cat.restoreConfirm.msg": "Reemplaza todas las categorías por las de fábrica.",
  "mt.cat.toast.deleted": "Categoría borrada",
  "mt.cat.toast.created": "Categoría creada",
  "mt.cat.toast.updated": "Categoría actualizada",
  "form.code": "Código",
  "form.cat.codeInfo": "Se escribe tras un guion, p.ej. -d. Debe ser único.",
  "form.extensions": "Extensiones",
  "form.extensions.info": "Separadas por comas. Los puntos son opcionales; se pasan a minúsculas.",
  "err.codeRequired": "El código es obligatorio",
  "err.extRequired": "Hace falta al menos una extensión",
  "err.catCodeUsed": 'El código "-{code}" ya lo usa {name}',
  "mt.tool.section": "Herramientas de orden",
  "mt.tool.section.sub": "Ordena/filtra resultados con --código",
  "mt.tool.edit": "Editar herramienta",
  "mt.tool.enable": "Activar herramienta",
  "mt.tool.disable": "Desactivar herramienta",
  "mt.tool.restore": "Restaurar herramientas por defecto",
  "mt.tool.save": "Guardar herramienta",
  "mt.tool.restoreConfirm.title": "¿Restaurar las herramientas por defecto?",
  "mt.tool.restoreConfirm.msg": "Resetea el código y el estado de cada herramienta de orden.",
  "mt.tool.on": "Sí",
  "mt.tool.off": "No",
  "mt.tool.toast.updated": "Herramienta actualizada",
  "form.tool.desc": "{label} — ordena los resultados por este campo.",
  "form.tool.codeInfo": "Se escribe tras un doble guion, p.ej. --dc. Debe ser único.",
  "form.enabled": "Activada",
  "err.toolCodeUsed": 'El código "--{code}" ya lo usa {label}',
  "mt.date.section": "Filtros de fecha",
  "mt.date.section.sub": "Args para --dc/--dm (p.ej. --dc,month o --dc,mar,2024)",
  "mt.date.edit": "Editar filtro de fecha",
  "mt.date.restore": "Restaurar filtros de fecha por defecto",
  "mt.date.save": "Guardar filtro de fecha",
  "mt.date.restoreConfirm.title": "¿Restaurar los filtros de fecha por defecto?",
  "mt.date.restoreConfirm.msg": "Resetea el código de cada filtro (today/week/month/year y jan…dec).",
  "mt.date.kind.month": "Mes",
  "mt.date.kind.window": "Ventana",
  "mt.date.toast.updated": "Filtro de fecha actualizado",
  "form.date.desc": "{label} — se usa como argumento de --dc/--dm.",
  "form.date.codeInfo": "Se escribe tras un comando de fecha, p.ej. --dc,today. Único; no puede ser 4 dígitos.",
  "err.qualFourDigits": "Un código de 4 dígitos choca con el filtro por año",
  "err.qualCodeUsed": 'El código "{code}" ya lo usa {label}',
  "mt.lang.section": "Idioma",
  "mt.lang.section.sub": "El idioma de la UI se elige en las preferencias de la extensión",
  "mt.lang.exportTemplate": "Exportar plantilla de idioma",
  "mt.lang.import": "Importar idioma…",
  "mt.lang.templateSaved": "Plantilla guardada",
  "mt.lang.imported": "Idioma importado — pon Language en Custom en las preferencias",
  "mt.lang.importInvalid": "JSON de idioma no válido",
  "mt.lang.current": "Activo: {lang}",
  "mt.lang.importDesc":
    "Elige un JSON traducido (mismas claves que la plantilla). Luego pon Custom en la preferencia Language.",
  "about.nav": "Acerca de Lumen",
  "about.openGithub": "Abrir perfil de GitHub",
  "about.find": "Find Anything",
  "about.subheader": "Open source · Local-first · Keyboard oriented\n\nNo subscriptions · No telemetry · No bullshit",
  "about.madeBy": "Hecho por Páramo Studio",
  "about.checkProjects": "Mira mis otros proyectos en GitHub →",
  "ex.title": "Exportar configuración",
  "ex.copy": "Copiar JSON",
  "ex.save": "Guardar en Descargas",
  "ex.import": "Importar desde archivo…",
  "ex.saved": "Guardado",
  "ex.imported": "Importado",
  "ex.importPick": "Elige un archivo",
  "ex.importInvalid": "JSON no válido",
  "ex.importNothing": "No hay nada reconocible que importar",
  "ex.importConfirm.title": "¿Reemplazar tu configuración de Lumen?",
  "ex.importConfirm.msg": "Sobrescribe tus {sections} con el contenido del archivo.",
  "ex.importAction": "Importar (reemplazar)",
  "ex.fileTitle": "Archivo JSON",
  "ex.importFormDesc":
    "Importar REEMPLAZA tu config actual de Lumen (workspaces, categorías, herramientas, filtros de fecha) con las secciones que traiga el archivo.",
};

const PACKS: Record<string, Record<string, string>> = { en: EN, es: ES };

function format(tpl: string, params?: Record<string, string | number>): string {
  if (!params) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

export async function getCustomLanguage(): Promise<Record<string, string> | null> {
  const raw = await LocalStorage.getItem<string>("customLanguage");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

export async function saveCustomLanguage(strings: Record<string, string>): Promise<void> {
  await LocalStorage.setItem("customLanguage", JSON.stringify(strings));
}

export function languageTemplate(): string {
  return JSON.stringify(EN, null, 2);
}

// Module-level translator usable anywhere (including pushed Forms, where React context
// would not reach). English/Spanish resolve synchronously from the preference; a custom
// imported pack is loaded once into a cache (takes effect on the next render/open).
let customCache: Record<string, string> = {};
let customRequested = false;

export const t: Translate = (key, params) => {
  const lang = getPreferenceValues<{ language?: string }>().language ?? "en";
  let pack: Record<string, string>;
  if (lang === "custom") {
    if (!customRequested) {
      customRequested = true;
      getCustomLanguage().then((c) => {
        if (c) customCache = c;
      });
    }
    pack = customCache;
  } else {
    pack = PACKS[lang] ?? EN;
  }
  return format(pack[key] ?? EN[key] ?? key, params);
};
