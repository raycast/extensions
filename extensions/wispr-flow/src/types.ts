export interface Transcript {
  transcriptEntityId: string;
  asrText: string | null;
  formattedText: string | null;
  editedText: string | null;
  timestamp: string | null;
  app: string | null;
  url: string | null;
  duration: number | null;
  numWords: number | null;
  status: string | null;
  language: string | null;
  conversationId: string | null;
  isArchived: number | null;
}

export interface GroupedTranscripts {
  title: string;
  transcripts: Transcript[];
}

export interface DictionaryEntry {
  id: string;
  phrase: string;
  replacement: string | null;
  manualEntry: number;
  source: string;
  frequencyUsed: number;
  createdAt: string;
  modifiedAt: string;
  isDeleted: number;
}
