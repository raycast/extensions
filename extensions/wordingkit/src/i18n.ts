import type { Language } from "./language.ts";

type UiStrings = {
  rewriteSelectedText: string;
  rewriteFailed: string;
  retry: string;
  openSettings: string;
  noModes: string;
  noModesDescription: string;
  cancel: string;
  rewrite: string;
  selectionMissing: string;
  selectedTextTooLong: (length: number, maximum: number) => string;
  configureApiKey: string;
  rewriteCancelled: string;
  editingModes: string;
  language: string;
  english: string;
  russian: string;
  currentPreset: (language: string) => string;
  changeLanguage: string;
  resetModes: string;
  resetModesQuestion: string;
  resetModesDescription: (language: string) => string;
  reset: string;
  createMode: string;
  editMode: string;
  deleteMode: string;
  deleteModeQuestion: string;
  deleteModeDescription: (title: string) => string;
  moveUp: string;
  moveDown: string;
  orderInRewrite: string;
  customOrder: string;
  lastUsedOrder: string;
  openPreferences: string;
  modeFormInvalid: string;
  newMode: string;
  save: string;
  title: string;
  description: string;
  provider: string;
  model: string;
  systemPrompt: string;
  temperature: string;
  maxTokens: string;
  actionFailed: (action: string) => string;
  damagedStorage: string;
  invalidModeField: (field: string) => string;
  unsupportedSort: string;
  modeNotFound: string;
};

export const UI_STRINGS: Record<Language, UiStrings> = {
  en: {
    rewriteSelectedText: "Rewrite Selected Text",
    rewriteFailed: "Could Not Rewrite Text",
    retry: "Retry",
    openSettings: "Open Settings",
    noModes: "No Modes",
    noModesDescription: "Create a mode in Settings to rewrite text.",
    cancel: "Cancel",
    rewrite: "Rewrite",
    selectionMissing: "No text selected",
    selectedTextTooLong: (length, maximum) =>
      `Selected text is too long (${length} characters). Maximum: ${maximum}.`,
    configureApiKey: "Configure an API key in Preferences",
    rewriteCancelled: "Processing was cancelled or exceeded 60 seconds.",
    editingModes: "Editing Modes",
    language: "Language",
    english: "English",
    russian: "Russian",
    currentPreset: (language) => `Current default preset: ${language}`,
    changeLanguage: "Change Language",
    resetModes: "Reset Modes",
    resetModesQuestion: "Reset modes?",
    resetModesDescription: (language) =>
      `All saved modes will be replaced with the ${language} defaults.`,
    reset: "Reset",
    createMode: "Create Mode",
    editMode: "Edit Mode",
    deleteMode: "Delete Mode",
    deleteModeQuestion: "Delete mode?",
    deleteModeDescription: (title) =>
      `Mode “${title}” will be permanently deleted.`,
    moveUp: "Move Up",
    moveDown: "Move Down",
    orderInRewrite: "Order in Rewrite This",
    customOrder: "Custom Order",
    lastUsedOrder: "Last Used",
    openPreferences: "Open Preferences",
    modeFormInvalid: "Check mode settings",
    newMode: "New Mode",
    save: "Save",
    title: "Title",
    description: "Description",
    provider: "Provider",
    model: "Model",
    systemPrompt: "System Prompt",
    temperature: "Temperature",
    maxTokens: "Maximum Tokens",
    actionFailed: (action) => `Could not ${action.toLowerCase()}`,
    damagedStorage: "Saved modes are corrupted. Edit them in Settings.",
    invalidModeField: (field) => `Invalid mode ${field}.`,
    unsupportedSort: "Choose a supported sort order.",
    modeNotFound: "Mode not found.",
  },
  ru: {
    rewriteSelectedText: "Переписать выделенный текст",
    rewriteFailed: "Не удалось переписать текст",
    retry: "Повторить",
    openSettings: "Открыть Настройки",
    noModes: "Нет режимов",
    noModesDescription:
      "Создайте режим в настройках, чтобы переписывать текст.",
    cancel: "Отменить",
    rewrite: "Переписать",
    selectionMissing: "Не выделен текст",
    selectedTextTooLong: (length, maximum) =>
      `Выделенный текст слишком длинный (${length} символов). Максимум: ${maximum}.`,
    configureApiKey: "Настройте API-ключ в Preferences",
    rewriteCancelled: "Обработка отменена или превысила 60 секунд.",
    editingModes: "Режимы редактирования",
    language: "Язык",
    english: "Английский",
    russian: "Русский",
    currentPreset: (language) => `Текущий стандартный набор: ${language}`,
    changeLanguage: "Изменить язык",
    resetModes: "Сбросить режимы",
    resetModesQuestion: "Сбросить режимы?",
    resetModesDescription: (language) =>
      `Все сохранённые режимы будут заменены стандартным набором ${language}.`,
    reset: "Сбросить",
    createMode: "Создать режим",
    editMode: "Изменить режим",
    deleteMode: "Удалить режим",
    deleteModeQuestion: "Удалить режим?",
    deleteModeDescription: (title) =>
      `Режим «${title}» будет удалён без возможности восстановления.`,
    moveUp: "Переместить выше",
    moveDown: "Переместить ниже",
    orderInRewrite: "Порядок в Rewrite This",
    customOrder: "Пользовательский порядок",
    lastUsedOrder: "По последнему использованию",
    openPreferences: "Открыть Preferences",
    modeFormInvalid: "Проверьте параметры режима",
    newMode: "Новый режим",
    save: "Сохранить",
    title: "Название",
    description: "Описание",
    provider: "Провайдер",
    model: "Модель",
    systemPrompt: "Системная инструкция",
    temperature: "Температура",
    maxTokens: "Максимум токенов",
    actionFailed: (action) => `Не удалось: ${action.toLowerCase()}`,
    damagedStorage: "Сохранённые режимы повреждены. Измените их в настройках.",
    invalidModeField: (field) => `Некорректное поле режима: ${field}.`,
    unsupportedSort: "Выберите поддерживаемый порядок сортировки.",
    modeNotFound: "Режим не найден.",
  },
};

export function getUiStrings(language: Language): UiStrings {
  return UI_STRINGS[language];
}
