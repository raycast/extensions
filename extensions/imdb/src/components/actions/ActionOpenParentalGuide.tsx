import { Action } from '@raycast/api';

type Props = {
  imdbID: string;
};

const ActionOpenParentalGuide = ({ imdbID }: Props) => (
  <Action.OpenInBrowser
    url={`https://www.imdb.com/title/${imdbID}/parentalguide`}
    title="Open Parental Guide"
    shortcut={{ modifiers: ['shift', 'cmd'], key: 'p' }}
  />
);

export default ActionOpenParentalGuide;
