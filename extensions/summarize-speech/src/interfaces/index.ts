
interface Preferences {
  gladiaApiKey: string;
  mistralApiKey: string;
}
interface VoiceMemo {
  title: string;
  filePath: string;
  date: Date;
}

interface Transcription {
  words: string[];
  language: string;
  transcription: string;
  confidence: number;
  time_begin: number;
  time_end: number;
  speaker: number;
  channel: string;
}

enum TranscriptionStatus {
  NOT_REQUESTED,
  REQUESTED,
  COMPLETE,
}


interface TranscriptionResult {
  timestamps: string; // Text with timestamps
  noTimestamps: string; // Text without timestamps
}

interface TranscriptionCache {
  transcriptionId: string;
  resultUrl: string;
  transcriptionResult: TranscriptionResult | null; // This will be null initially until transcription is complete
  title: string;
  summary: string;
  status: TranscriptionStatus;
  isArchived: boolean;
}

interface SummaryViewProps {
  summary: string;
}

interface SelectedMemoProps {
    selectedMemo: VoiceMemo;
    setSelectedMemo: (memo: VoiceMemo | null) => void;
    cache: TranscriptionCache | null;
}

interface SummaryType {
    value: string;
    label: string;
}

interface CustomSummaryInputProps {
    text: string;
    onGenerateSummary: (summaryType: SummaryType, customSystemPrompt?: string, customUserPrompt?: string) => void;
    isLoading: boolean;
}

export {
  VoiceMemo,
  Transcription,
  TranscriptionStatus,
  TranscriptionResult,
  TranscriptionCache,
  SummaryViewProps,
  Preferences,
    SelectedMemoProps,
    SummaryType,
    CustomSummaryInputProps,
};
