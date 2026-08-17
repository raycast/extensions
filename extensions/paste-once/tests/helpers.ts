import { TextCleaner } from "../src/lib/text-cleaner";
import { Aggressiveness, TrimConfig, defaultTrimConfig } from "../src/lib/types";

export function cleaner(): TextCleaner {
  return new TextCleaner();
}

export function cfg(partial: Partial<TrimConfig> = {}): TrimConfig {
  return defaultTrimConfig(partial);
}

export function transformIfCommand(
  text: string,
  partial: Partial<TrimConfig> = {},
  override?: Aggressiveness,
): string | null {
  return cleaner().transformIfCommand(text, cfg(partial), override);
}
