import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  indent: IndentType;
}

type IndentType = 'tab' | '2' | '4' | '8';

function getIndentation(): IndentType {
  const { indent } = getPreferenceValues<Preferences>();
  return indent;
}

export { getIndentation };
