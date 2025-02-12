import { TranslateList } from "./components/TranslateList";

// Format to constant case
const formatConstant = (text: string) => {
  return text.toUpperCase().replace(/\s+/g, "_");
};

export default function Command({ arguments: { queryText } }: { arguments: { queryText?: string } }) {
  return <TranslateList formatFunction={formatConstant} queryText={queryText} />;
}
