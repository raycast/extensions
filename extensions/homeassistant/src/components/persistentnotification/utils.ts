export interface HAPersistentNotification {
  message: string;
  notification_id: string;
  title?: string;
  created_at: string;
}

export const ensureShort = (text: string): string => {
  const max = 80;
  if (text.length > max) {
    return text.slice(0, max) + " ...";
  }
  return text;
};
