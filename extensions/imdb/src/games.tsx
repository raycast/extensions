import { LaunchProps, View } from './components/View';

export default function GamesResults(props: LaunchProps) {
  return <View type="game" includeGames {...props} />;
}
