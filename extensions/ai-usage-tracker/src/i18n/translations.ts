export type Lang = "en" | "fr";

export interface AheadParams {
  delta: number;
  monthPct: number;
  usage: number;
  extraRequests: number;
  budgetPerDay: string;
  daysLeft: number;
}

export interface BehindParams {
  delta: number;
  monthPct: number;
  usage: number;
  budgetPerDay: string;
  daysLeft: number;
}

export interface NeutralParams {
  monthPct: number;
  usage: number;
  budgetPerDay: string;
  daysLeft: number;
}

export interface Translations {
  // Navigation
  navTitle: string;
  // Actions
  actionOpenSettings: string;
  actionUpdateUsage: string;
  // Form
  formTitleFirstRun: string;
  formTitleSettings: string;
  formTitleUpdateUsage: string;
  formDesc: (cost: number) => string;
  formUsageLabel: string;
  formUsagePlaceholder: string;
  formUsageInfo: string;
  formCostLabel: string;
  formCostPlaceholder: string;
  formCostInfo: string;
  formLanguageLabel: string;
  formCountryLabel: string;
  formSubmitButton: string;
  // Validation
  validationInvalidUsage: string;
  validationInvalidUsageMsg: string;
  validationInvalidCost: string;
  validationInvalidCostMsg: string;
  // Status titles
  statusAhead: string;
  statusBehind: string;
  statusNeutral: string;
  statusIdle: string;
  // Status messages
  messageIdle: string;
  messageAhead: (p: AheadParams) => string;
  messageBehind: (p: BehindParams) => string;
  messageNeutral: (p: NeutralParams) => string;
  // Metadata labels
  metaRequestsToday: string;
  mdRequestsToday: (n: number, budgetPerDay: string) => string;
  metaMonthDone: string;
  metaWorkingDay: string;
  metaYouUsed: string;
  metaDelta: string;
  metaDeltaAhead: (n: number) => string;
  metaDeltaBehind: (n: number) => string;
  metaDeltaOnTrack: string;
  metaCountry: string;
  metaHolidaysTitle: string;
  metaPublicHolidays: (count: number, monthName: string, year: number) => string;
  toastUsageSaved: string;
  metaHolidaysUnavailable: string;
  metaHolidaysLoading: string;
  metaDataSource: string;
  // Markdown
  mdMonthProgress: string;
  mdYourUsage: string;
  mdFetchingHolidays: string;
}

const en: Translations = {
  navTitle: "AI Requests Usage Tracker",
  actionOpenSettings: "Settings",
  actionUpdateUsage: "Update Usage",

  formTitleFirstRun: "Welcome — Set Up Your Tracker",
  formTitleSettings: "Settings",
  formTitleUpdateUsage: "Update Usage",
  formDesc: (cost) =>
    `Each premium request uses ${cost}% of your monthly cap. Enter your current usage and configure your preferences.`,
  formUsageLabel: "Current usage (%)",
  formUsagePlaceholder: "0 - 100",
  formUsageInfo: "Your current AI premium requests usage percentage (0-100)",
  formCostLabel: "Cost per request (%)",
  formCostPlaceholder: "e.g. 0.3",
  formCostInfo: "How much % each premium request consumes (default: 0.3%)",
  formLanguageLabel: "Language",
  formCountryLabel: "Country",
  formSubmitButton: "Save",

  validationInvalidUsage: "Invalid usage",
  validationInvalidUsageMsg: "Please enter a whole number between 0 and 100.",
  validationInvalidCost: "Invalid cost",
  validationInvalidCostMsg: "Please enter a positive number (e.g. 0.3).",

  statusAhead: "Ahead of the curve",
  statusBehind: "Behind the curve",
  statusNeutral: "On track",
  statusIdle: "Track your usage",

  messageIdle: "Fill in your current usage percentage below to see where you stand.",
  messageAhead: ({ delta, monthPct, usage, extraRequests, budgetPerDay, daysLeft }) =>
    `You're **ahead** by ${Math.abs(delta)} points — the month is ${monthPct}% done but you've only used ${usage}%.\n\n` +
    `You could burn **~${extraRequests}** more premium requests before catching the curve.\n\n` +
    `Budget left: **~${budgetPerDay}%** per working day (${daysLeft} days remain).`,
  messageBehind: ({ delta, monthPct, usage, budgetPerDay, daysLeft }) =>
    `You're **behind** by ${delta} points — the month is ${monthPct}% done but you've used ${usage}%.\n\n` +
    `To stay within budget, aim for **≤${budgetPerDay}%** per working day over the next ${daysLeft} days.`,
  messageNeutral: ({ monthPct, usage, budgetPerDay, daysLeft }) =>
    `**Right on track.** Month is ${monthPct}% done, you've used ${usage}%.\n\n` +
    `Keep to **~${budgetPerDay}%** per working day (${daysLeft} days left) to stay safe.`,

  metaRequestsToday: "Requests left today",
  mdRequestsToday: (n, budgetPerDay) => `⚡ **~${n} requests / day** to stay on track *(${budgetPerDay}% / day)*`,
  metaMonthDone: "Month done",
  metaWorkingDay: "Working day",
  metaYouUsed: "You used",
  metaDelta: "Delta",
  metaDeltaAhead: (n) => `${n} % ahead`,
  metaDeltaBehind: (n) => `+${n} % behind`,
  metaDeltaOnTrack: "±0 %",
  metaCountry: "Country",
  metaHolidaysTitle: "Holidays",
  metaPublicHolidays: (count, monthName, year) =>
    count === 1 ? `1 public holiday · ${monthName} ${year}` : `${count} public holidays · ${monthName} ${year}`,
  toastUsageSaved: "Usage updated",
  metaHolidaysUnavailable: "Unavailable — weekdays only",
  metaHolidaysLoading: "Loading…",
  metaDataSource: "Holidays data source",

  mdMonthProgress: "**Month progress** (working days)",
  mdYourUsage: "**Your usage**",
  mdFetchingHolidays: "*⏳ Fetching public holidays…*",
};

const fr: Translations = {
  navTitle: "Suivi des requêtes premium",
  actionOpenSettings: "Paramètres",
  actionUpdateUsage: "Mettre à jour l'utilisation",

  formTitleFirstRun: "Bienvenue — Configurez votre suivi",
  formTitleSettings: "Paramètres",
  formTitleUpdateUsage: "Mettre à jour l'utilisation",
  formDesc: (cost) =>
    `Chaque requête premium consomme ${cost} % de votre quota mensuel. Entrez votre utilisation actuelle et configurez vos préférences.`,
  formUsageLabel: "Utilisation actuelle (%)",
  formUsagePlaceholder: "0 - 100",
  formUsageInfo: "Votre pourcentage d'utilisation actuel des requêtes premium IA (0-100)",
  formCostLabel: "Coût par requête (%)",
  formCostPlaceholder: "ex. 0.3",
  formCostInfo: "Combien de % chaque requête premium consomme (défaut : 0,3 %)",
  formLanguageLabel: "Langue",
  formCountryLabel: "Pays",
  formSubmitButton: "Enregistrer",

  validationInvalidUsage: "Valeur invalide",
  validationInvalidUsageMsg: "Veuillez entrer un nombre entier entre 0 et 100.",
  validationInvalidCost: "Coût invalide",
  validationInvalidCostMsg: "Veuillez entrer un nombre positif (ex. 0.3).",

  statusAhead: "En avance",
  statusBehind: "En retard",
  statusNeutral: "Dans les temps",
  statusIdle: "Suivre votre utilisation",

  messageIdle: "Renseignez votre pourcentage d'utilisation ci-dessous pour voir où vous en êtes.",
  messageAhead: ({ delta, monthPct, usage, extraRequests, budgetPerDay, daysLeft }) =>
    `Vous êtes **en avance** de ${Math.abs(delta)} points — le mois est avancé à ${monthPct} % mais vous n'avez utilisé que ${usage} %.\n\n` +
    `Vous pourriez consommer **~${extraRequests}** requêtes premium supplémentaires avant de rattraper la courbe.\n\n` +
    `Budget restant : **~${budgetPerDay} %** par jour ouvré (${daysLeft} jours restants).`,
  messageBehind: ({ delta, monthPct, usage, budgetPerDay, daysLeft }) =>
    `Vous êtes **en retard** de ${delta} points — le mois est avancé à ${monthPct} % mais vous avez utilisé ${usage} %.\n\n` +
    `Pour rester dans le budget, visez **≤${budgetPerDay} %** par jour ouvré sur les ${daysLeft} prochains jours.`,
  messageNeutral: ({ monthPct, usage, budgetPerDay, daysLeft }) =>
    `**Dans les temps.** Le mois est avancé à ${monthPct} %, vous avez utilisé ${usage} %.\n\n` +
    `Maintenez **~${budgetPerDay} %** par jour ouvré (${daysLeft} jours restants) pour rester en sécurité.`,

  metaRequestsToday: "Restantes aujourd'hui",
  mdRequestsToday: (n, budgetPerDay) =>
    `⚡ **~${n} requêtes / jour** pour rester dans les temps *(${budgetPerDay} % / jour)*`,
  metaMonthDone: "Mois écoulé",
  metaWorkingDay: "Jour ouvré",
  metaYouUsed: "Vous avez utilisé",
  metaDelta: "Écart",
  metaDeltaAhead: (n) => `${n} % d'avance`,
  metaDeltaBehind: (n) => `+${n} % de retard`,
  metaDeltaOnTrack: "±0 %",
  metaCountry: "Pays",
  metaHolidaysTitle: "Jours fériés",
  metaPublicHolidays: (count, monthName, year) =>
    count === 1 ? `1 jour férié · ${monthName} ${year}` : `${count} jours fériés · ${monthName} ${year}`,
  toastUsageSaved: "Utilisation mise à jour",
  metaHolidaysUnavailable: "Indisponible — jours de semaine seulement",
  metaHolidaysLoading: "Chargement…",
  metaDataSource: "Source jours fériés",

  mdMonthProgress: "**Avancement du mois** (jours ouvrés)",
  mdYourUsage: "**Votre utilisation**",
  mdFetchingHolidays: "*⏳ Chargement des jours fériés…*",
};

export const TRANSLATIONS: Record<Lang, Translations> = { en, fr };

export function getTranslations(lang: Lang): Translations {
  return TRANSLATIONS[lang];
}
