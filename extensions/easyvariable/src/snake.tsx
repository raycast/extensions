import { TranslateList } from "./components/TranslateList";

const formatSnakeCase = (text: string) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

export default function Command({ arguments: { queryText } }: { arguments: { queryText?: string } }) {
  return <TranslateList formatFunction={formatSnakeCase} queryText={queryText} />;
}
