import type { Alert } from "../types/alert";

/**
 * Render a human-readable text of an alert condition
 * @param alert
 * @returns
 */
export const renderAlertCondition = (alert: Alert) =>
  alert.min ? `over ${alert.value}% in ${alert.min}min` : "all changes";
