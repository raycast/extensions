export interface Usage {
  usedCharacters: number;
  totalCharacters: number;
}

export interface Record {
  id: string;
  title: string;
  description: string;
  apiKey: string;
  usage: Usage;
  inUse?: boolean;
}

export interface FormValues {
  title: string;
  description: string;
  apiKey: string;
}
