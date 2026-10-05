export type SpeechPlist = {
  voice: string;
  rate: number;
};

export type StoredSaySettings = {
  voice: string;
  rate: string;
  audioDevice: string;
  keepSilentOnError: boolean;
};

export type ParsedSaySettings = {
  voice?: string;
  rate?: number;
  audioDevice?: string;
  keepSilentOnError?: boolean;
};
