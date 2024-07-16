export type SpeechPlist = {
  voice: string;
  rate: number;
};

export type StoredSaySettings = {
  voice: string;
  rate: string;
  audioDevice: string;
};

export type ParsedSaySettings = {
  voice?: string;
  rate?: number;
  audioDevice?: string;
};
