export const ICONS = {
  PRIORITY: {
    HIGHEST: "🔺",
    HIGH: "⏫",
    MEDIUM: "🔼",
    LOW: "🔽",
    LOWEST: "⏬",
  },
  DATE: {
    DUE: "📅",
    SCHEDULED: "⏳",
    START: "🛫",
    COMPLETION: "✅",
  },
  RECURRING: "🔁",
};

export const TAGS_REGEX = /#(\w+)/g;

export const TASK_REGEX = /^(\s*)[-*+] \[([ xX])\] (.*)/;

export const ICON_REGEX = {
  PRIORITY: /🔺|⏫|🔼|🔽|⏬/,
  DUE_DATE: new RegExp(`${ICONS.DATE.DUE} (\\d{4}-\\d{2}-\\d{2})`),
  SCHEDULED_DATE: new RegExp(`${ICONS.DATE.SCHEDULED} (\\d{4}-\\d{2}-\\d{2})`),
  START_DATE: new RegExp(`${ICONS.DATE.START} (\\d{4}-\\d{2}-\\d{2})`),
  COMPLETION_DATE: new RegExp(`${ICONS.DATE.COMPLETION} (\\d{4}-\\d{2}-\\d{2})`),
  RECURRING: new RegExp(
    `${ICONS.RECURRING} (.*?)(?=${ICONS.PRIORITY.HIGHEST}|${ICONS.PRIORITY.HIGH}|${ICONS.PRIORITY.MEDIUM}|${ICONS.PRIORITY.LOW}|${ICONS.PRIORITY.LOWEST}|${ICONS.DATE.DUE}|${ICONS.DATE.SCHEDULED}|${ICONS.DATE.START}|${ICONS.DATE.COMPLETION}|\\s*$)`
  ),
};
