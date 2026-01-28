import { LaunchProps, View } from './components/View';
import { usePreferences } from './hooks/usePreferences';

export default function MoviesResults(props: LaunchProps) {
  const { includeGames } = usePreferences();

  return <View type="movie" includeGames={includeGames} {...props} />;
}
