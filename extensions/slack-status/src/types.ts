export type SlackStatus = {
  emojiCode: string;
  title: string;
  expiration?: number; // timestamp in milliseconds
};

export type SlackStatusPreset = {
  id?: string;
  emojiCode: string;
  title: string;
  defaultDuration: number; // 0 means "don't clear"
};

export type FormValues = {
  emoji: string;
  statusText: string;
  duration: string;
};

export interface CommandLinkParams {
  presetId: string;
}
