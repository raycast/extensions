import { Action } from '@raycast/api';
import { Icon } from '@raycast/api';

type Props = {
  imdbID: string;
};

const ActionOpenParentalGuide = ({ imdbID }: Props) => (
  <Action.OpenInBrowser
    url={`https://www.imdb.com/title/${imdbID}/parentalguide`}
    title="Open Parental Guide"
    shortcut={{
      macOS: { modifiers: ['shift', 'cmd'], key: 'p' },
      Windows: { modifiers: ['shift', 'ctrl'], key: 'p' },
    }}
    icon={Icon.SpeechBubbleImportant}
  />
);

export default ActionOpenParentalGuide;
