import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  indent: IndentType;
  autopaste: boolean;
}

type IndentType = 'tab' | '2' | '4' | '8';

function getIndentation(): IndentType {
  const { indent } = getPreferenceValues<Preferences>();
  return indent;
}

function autoPasteEnabled(): boolean {
  const { autopaste } = getPreferenceValues<Preferences>();
  return autopaste;
}

export { getIndentation, autoPasteEnabled };
