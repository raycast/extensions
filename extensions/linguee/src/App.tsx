import { ValidLanguagePairKey } from "./constants";
import { ResultList } from "./components/ResultList";

export default function App({ languagePairKey }: { languagePairKey: ValidLanguagePairKey }) {
  return <ResultList languagePairKey={languagePairKey} />;
}
