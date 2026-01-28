import { LaunchProps, View } from './components/View';
import { usePreferences } from './hooks/usePreferences';

export default function SeriesResults(props: LaunchProps) {
  const { includeGames } = usePreferences();

  return <View type="series" includeGames={includeGames} {...props} />;
}
