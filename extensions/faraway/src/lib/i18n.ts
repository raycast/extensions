import { getPreferenceValues } from "@raycast/api";

export type Language = "en" | "pt";

type Preferences = { language?: Language };

const STRINGS = {
  en: {
    // common
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    addFriend: "Add Friend",
    manageFriends: "Manage Friends",
    // add/edit form
    nameLabel: "Name",
    namePlaceholder: "Clara",
    timezoneLabel: "City or Timezone",
    timezonePlaceholder: "Search city or IANA timezone",
    avatarLabel: "Photo",
    saveFriend: "Save Friend",
    // menu bar / list
    noFriendsTitle: "No friends yet",
    noFriendsDescription: "Add your first friend to see their local time here.",
    night: "Night",
    showDetails: "Show Details",
    detailCity: "City",
    detailTime: "Local time",
    detailTimezone: "Timezone",
    replacePhoto: "Replace Photo",
    removePhoto: "Remove Photo",
    // toasts
    friendSaved: "Friend saved",
    friendDeleted: "Friend deleted",
    friendDeleteFailed: "Failed to delete friend",
    saveFailed: "Failed to save friend",
    nameRequired: "Name is required",
    timezoneRequired: "Timezone is required",
    confirmDeleteTitle: "Delete this friend?",
    confirmDeleteMessage: "This cannot be undone.",
    tzSearchHintTitle: "Examples",
    tzSearchHint: "Tokyo · London · America/New_York",
  },
  pt: {
    cancel: "Cancelar",
    save: "Salvar",
    delete: "Excluir",
    edit: "Editar",
    addFriend: "Adicionar amigo",
    manageFriends: "Gerenciar amigos",
    nameLabel: "Nome",
    namePlaceholder: "Clara",
    timezoneLabel: "Cidade ou fuso horário",
    timezonePlaceholder: "Buscar cidade ou fuso IANA",
    avatarLabel: "Foto",
    saveFriend: "Salvar amigo",
    noFriendsTitle: "Nenhum amigo ainda",
    noFriendsDescription: "Adicione seu primeiro amigo para ver o horário local aqui.",
    night: "Noite",
    showDetails: "Ver detalhes",
    detailCity: "Cidade",
    detailTime: "Horário local",
    detailTimezone: "Fuso horário",
    replacePhoto: "Substituir foto",
    removePhoto: "Remover foto",
    friendSaved: "Amigo salvo",
    friendDeleted: "Amigo excluído",
    friendDeleteFailed: "Falha ao excluir amigo",
    saveFailed: "Falha ao salvar amigo",
    nameRequired: "Nome é obrigatório",
    timezoneRequired: "Fuso horário é obrigatório",
    confirmDeleteTitle: "Excluir este amigo?",
    confirmDeleteMessage: "Esta ação não pode ser desfeita.",
    tzSearchHintTitle: "Exemplos",
    tzSearchHint: "Tokyo · London · America/New_York",
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

export function getLanguage(): Language {
  const lang = getPreferenceValues<Preferences>().language;
  return lang === "pt" ? "pt" : "en";
}

export function t(key: StringKey): string {
  const lang = getLanguage();
  return STRINGS[lang][key] ?? STRINGS.en[key];
}
