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

export interface ContentText {
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
  metaHolidaysUnavailable: string;
  metaHolidaysLoading: string;
  metaDataSource: string;
  // Markdown
  mdMonthProgress: string;
  mdYourUsage: string;
  mdFetchingHolidays: string;
}

export const contentText: ContentText = {
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
  metaHolidaysUnavailable: "Unavailable — weekdays only",
  metaHolidaysLoading: "Loading…",
  metaDataSource: "Holidays data source",

  mdMonthProgress: "**Month progress** (working days)",
  mdYourUsage: "**Your usage**",
  mdFetchingHolidays: "*⏳ Fetching public holidays…*",
};
