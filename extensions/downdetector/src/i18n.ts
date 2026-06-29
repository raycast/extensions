import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  language: string;
}

const strings = {
  en: {
    // Search
    searchPlaceholder: "Search for a service (e.g. GitHub, Netflix, OVH…)",
    searchTitle: "Search a Service",
    searchDescription: "Type at least 2 characters to search on Downdetector",
    searchNoResults: (q: string) => `No results found for "${q}"`,
    searchError: "Failed to load results",

    // Status labels
    statusNormal: "Normal operation",
    statusWarning: "Issues reported",
    statusDanger: "Outage reported",
    statusUnknown: "Unknown status",

    // Detail view
    detailMetaStatus: "Status",
    detailMetaReports: "Reports (24h)",
    detailMetaLink: "View on Downdetector",
    detailChartTitle: "Reports over the last 24 hours",
    detailLoadError: (name: string) => `Failed to load status for **${name}**.`,

    // Actions
    actionViewDetail: "View Details",
    actionOpenBrowser: "Open on Downdetector",
    actionReport: "Report a Problem",
    actionRetry: "Retry",
    actionRefresh: "Refresh",
    actionOpenPrefs: "Open Preferences",
    actionReportInBrowser: "Report in Browser",

    // Report view
    reportNavTitle: (name: string) => `Report — ${name}`,
    reportSectionTitle: (name: string) =>
      `What problem are you experiencing with ${name}?`,
    reportConfirmTitle: "Report a Problem",
    reportConfirmMessage: (label: string, name: string) =>
      `Confirm report "${label}" for ${name}?`,
    reportConfirmAction: "Report",
    reportSending: "Sending report…",
    reportSuccess: (name: string) => `✅ Report sent for ${name}`,
    reportFailTitle: "Could not send report",
    reportErrorTitle: "Network error",

    // Report types
    reportTypes: [
      { id: "1", label: "Internet connectivity", value: "1" },
      { id: "2", label: "Total outage (service unreachable)", value: "2" },
      { id: "4", label: "Website connection", value: "4" },
      { id: "5", label: "Mobile app", value: "5" },
      { id: "8", label: "Performance / Slowness", value: "8" },
    ],

    // History
    historySection: "Recent",
    actionRemoveFromHistory: "Remove from History",
    actionClearHistory: "Clear History",

    // Errors
    errorTooManyRequests: "Too many requests — please wait a few seconds",
    errorLoadFailed: "Load failed",
  },

  fr: {
    searchPlaceholder: "Rechercher un service (ex: GitHub, Netflix, OVH…)",
    searchTitle: "Rechercher un service",
    searchDescription:
      "Tapez au moins 2 caractères pour chercher sur Downdetector",
    searchNoResults: (q: string) => `Aucun résultat pour "${q}"`,
    searchError: "Erreur de chargement",

    statusNormal: "Fonctionnement normal",
    statusWarning: "Problèmes signalés",
    statusDanger: "Panne signalée",
    statusUnknown: "Statut inconnu",

    detailMetaStatus: "Statut",
    detailMetaReports: "Signalements (24h)",
    detailMetaLink: "Voir sur Downdetector",
    detailChartTitle: "Signalements sur les dernières 24 heures",
    detailLoadError: (name: string) =>
      `Impossible de charger le statut de **${name}**.`,

    actionViewDetail: "Voir le statut détaillé",
    actionOpenBrowser: "Ouvrir sur Downdetector",
    actionReport: "Signaler un problème",
    actionRetry: "Réessayer",
    actionRefresh: "Actualiser",
    actionOpenPrefs: "Ouvrir les préférences",
    actionReportInBrowser: "Signaler dans le navigateur",

    reportNavTitle: (name: string) => `Signaler — ${name}`,
    reportSectionTitle: (name: string) =>
      `Quel problème rencontrez-vous avec ${name} ?`,
    reportConfirmTitle: "Signaler un problème",
    reportConfirmMessage: (label: string, name: string) =>
      `Confirmer le signalement "${label}" pour ${name} ?`,
    reportConfirmAction: "Signaler",
    reportSending: "Envoi du signalement…",
    reportSuccess: (name: string) => `✅ Signalement envoyé pour ${name}`,
    reportFailTitle: "Envoi impossible",
    reportErrorTitle: "Erreur réseau",

    reportTypes: [
      { id: "1", label: "Connexion internet", value: "1" },
      { id: "2", label: "Total (service inaccessible)", value: "2" },
      { id: "4", label: "Connexion au site web", value: "4" },
      { id: "5", label: "Application mobile", value: "5" },
      { id: "8", label: "Performance / Lenteur", value: "8" },
    ],

    historySection: "Récents",
    actionRemoveFromHistory: "Retirer de l'historique",
    actionClearHistory: "Effacer l'historique",

    errorTooManyRequests: "Trop de requêtes — réessaie dans quelques secondes",
    errorLoadFailed: "Erreur de chargement",
  },
} as const;

type Lang = keyof typeof strings;

export function useT() {
  const prefs = getPreferenceValues<Preferences>();
  const lang: Lang = (prefs.language ?? "en") as Lang;
  return strings[lang] ?? strings.en;
}
