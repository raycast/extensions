import { ChordsVisualizer } from "./chords-visualizer";

export default function Command(props: { arguments: { chordKey: string; chordSuffix: string } }) {
  const { chordKey, chordSuffix } = props.arguments;

  return <ChordsVisualizer chordKey={chordKey} chordSuffix={chordSuffix} />;
}
