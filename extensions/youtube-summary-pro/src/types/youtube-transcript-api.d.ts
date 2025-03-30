declare module "youtube-transcript-api" {
  interface TranscriptItem {
    text: string;
    duration: number;
    offset: number;
  }

  export function getTranscript(videoId: string): Promise<TranscriptItem[]>;
}
