export interface Transcript {
  id: string;
  recording_id: string;
  content: string;
  segments: TranscriptSegment[];
  language?: string;
  created_at: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  speaker_id?: string;
  text: string;
  start_time: number;
  end_time: number;
  confidence?: number;
}

export interface TranscriptSearchResult {
  recording_id: string;
  recording_title: string;
  segments: TranscriptSegment[];
  match_count: number;
}
