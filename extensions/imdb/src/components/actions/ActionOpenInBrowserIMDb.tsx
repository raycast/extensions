import { Action } from '@raycast/api';

type Props = {
  imdbID: string;
};

const ActionOpenInBrowserIMDb = ({ imdbID }: Props) => (
  <Action.OpenInBrowser url={`https://www.imdb.com/title/${imdbID}/`} />
);

export default ActionOpenInBrowserIMDb;
