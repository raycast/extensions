declare module "youtube-captions-scraper" {
  interface SubtitleOptions {
    videoID: string;
    lang?: string;
  }

  interface Caption {
    text: string;
    start: number;
    dur: number;
  }

  export function getSubtitles(options: SubtitleOptions): Promise<Caption[]>;
}
