import { processText } from './processText';
import { splitByPattern } from './splitByPattern';

// Look up the chunks of text that NOT need to be formatted
export function processInput(selectedText: string, preferences?: Preferences) {
  const chunks = splitByPattern(selectedText);
  const formattedChunks = chunks.map(([chunk, pattern]) => {
    switch (pattern) {
      case 'nomatch':
        return processText(chunk, preferences);
      default:
        return chunk;
    }
  });
  return formattedChunks.join('');
}
