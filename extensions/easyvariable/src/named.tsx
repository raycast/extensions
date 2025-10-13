import { TranslateList } from "./components/TranslateList";

export default function Command({ arguments: { queryText } }: { arguments: { queryText?: string } }) {
  return <TranslateList queryText={queryText} />;
}
