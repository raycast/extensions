import { speakWord } from './services/pronunciation-service';

export type PronounceProps = {
  arguments?: {
    word?: string;
  };
  fallbackText?: string;
};

/**
 * Background audio pronunciation command (mode: no-view).
 * Runs completely in the background without opening any browser or window.
 */
export default async function PronounceCommand(props?: PronounceProps) {
  const word = props?.arguments?.word || props?.fallbackText || '';
  if (word) {
    try {
      await speakWord(word);
    } catch (err) {
      console.error('[pronounce] Failed to speak word:', err);
    }
  }
}
