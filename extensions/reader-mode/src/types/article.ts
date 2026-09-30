import { ArchiveSource } from "../utils/paywall-hopper";

export interface ArticleState {
  bodyMarkdown: string;
  title: string;
  byline: string | null;
  siteName: string | null;
  url: string;
  source: string;
  textContent: string;
  bypassedReadabilityCheck?: boolean;
  /** Metadata about archive source if content was retrieved via Paywall Hopper */
  archiveSource?: ArchiveSource;
}
