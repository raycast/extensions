/**
 * Unified icon mapping utilities for events and notification categories.
 * Uses data-driven approach to eliminate duplicated if/else chains.
 */

import { Icon, Color } from "@raycast/api";

export interface IconAppearance {
  source: Icon;
  tintColor: Color;
}

const DEFAULT_ICON: IconAppearance = { source: Icon.Circle, tintColor: Color.SecondaryText };

// ============== Event Icon Mapping ==============

/**
 * Maps event action strings to icon appearances.
 * Uses keyword matching for flexibility.
 */
const EVENT_ICON_RULES: Array<{
  keywords: string[];
  subKeywords?: Array<{ keywords: string[]; icon: IconAppearance }>;
  icon: IconAppearance;
}> = [
  {
    keywords: ["payment"],
    subKeywords: [
      { keywords: ["received", "incoming"], icon: { source: Icon.ArrowDown, tintColor: Color.Green } },
      { keywords: ["sent", "outgoing"], icon: { source: Icon.ArrowUp, tintColor: Color.Orange } },
    ],
    icon: { source: Icon.BankNote, tintColor: Color.Blue },
  },
  {
    keywords: ["request"],
    subKeywords: [
      { keywords: ["inquiry"], icon: { source: Icon.ArrowRight, tintColor: Color.Purple } },
      { keywords: ["response"], icon: { source: Icon.ArrowLeft, tintColor: Color.Magenta } },
    ],
    icon: { source: Icon.Envelope, tintColor: Color.Purple },
  },
  {
    keywords: ["card"],
    subKeywords: [{ keywords: ["transaction"], icon: { source: Icon.CreditCard, tintColor: Color.Blue } }],
    icon: { source: Icon.CreditCard, tintColor: Color.SecondaryText },
  },
  {
    keywords: ["bunqme", "tab"],
    icon: { source: Icon.Link, tintColor: Color.Green },
  },
  {
    keywords: ["schedule"],
    icon: { source: Icon.Calendar, tintColor: Color.Orange },
  },
  {
    keywords: ["share"],
    icon: { source: Icon.TwoPeople, tintColor: Color.Blue },
  },
];

/**
 * Get icon appearance for an event action.
 */
export function getEventIcon(action: string | undefined): IconAppearance {
  if (!action) return DEFAULT_ICON;

  const actionLower = action.toLowerCase();

  for (const rule of EVENT_ICON_RULES) {
    if (rule.keywords.some((kw) => actionLower.includes(kw))) {
      // Check sub-keywords first for more specific matches
      if (rule.subKeywords) {
        for (const sub of rule.subKeywords) {
          if (sub.keywords.some((kw) => actionLower.includes(kw))) {
            return sub.icon;
          }
        }
      }
      return rule.icon;
    }
  }

  return DEFAULT_ICON;
}

// ============== Notification Category Icon Mapping ==============

/**
 * Maps notification category strings to icon appearances.
 */
const NOTIFICATION_CATEGORY_MAP: Record<string, IconAppearance> = {
  PAYMENT: { source: Icon.BankNote, tintColor: Color.Green },
  MUTATION: { source: Icon.BankNote, tintColor: Color.Green },
  CARD: { source: Icon.CreditCard, tintColor: Color.Blue },
  CARD_TRANSACTION_FAILED: { source: Icon.CreditCard, tintColor: Color.Red },
  CARD_TRANSACTION_SUCCESSFUL: { source: Icon.CreditCard, tintColor: Color.Green },
  REQUEST: { source: Icon.Envelope, tintColor: Color.Purple },
  SCHEDULE: { source: Icon.Calendar, tintColor: Color.Orange },
  SCHEDULE_RESULT: { source: Icon.Calendar, tintColor: Color.Orange },
  SCHEDULE_STATUS: { source: Icon.Calendar, tintColor: Color.Orange },
  SHARE: { source: Icon.TwoPeople, tintColor: Color.Magenta },
  TAB: { source: Icon.Link, tintColor: Color.Yellow },
  TAB_RESULT: { source: Icon.Link, tintColor: Color.Yellow },
  BUNQME_TAB: { source: Icon.Link, tintColor: Color.Yellow },
  DRAFT: { source: Icon.Document, tintColor: Color.SecondaryText },
  DRAFT_PAYMENT: { source: Icon.Document, tintColor: Color.SecondaryText },
};

const DEFAULT_NOTIFICATION_ICON: IconAppearance = { source: Icon.Bell, tintColor: Color.SecondaryText };

/**
 * Get icon appearance for a notification category.
 */
export function getNotificationCategoryIcon(category: string): IconAppearance {
  const cat = category.toUpperCase();

  // Try exact match first
  if (NOTIFICATION_CATEGORY_MAP[cat]) {
    return NOTIFICATION_CATEGORY_MAP[cat];
  }

  // Try keyword matching for partial matches
  // Sort by key length descending to match longer (more specific) keys first
  const sortedEntries = Object.entries(NOTIFICATION_CATEGORY_MAP).sort(([a], [b]) => b.length - a.length);
  for (const [key, icon] of sortedEntries) {
    if (cat.includes(key)) {
      return icon;
    }
  }

  return DEFAULT_NOTIFICATION_ICON;
}
