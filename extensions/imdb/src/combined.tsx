import { LaunchProps, View } from './components/View';
import { usePreferences } from './hooks/usePreferences';

export default function CombinedResults(props: LaunchProps) {
  const { includeGames } = usePreferences();

  return (
    <View type={undefined} includeGames={includeGames} showType {...props} />
  );
}
