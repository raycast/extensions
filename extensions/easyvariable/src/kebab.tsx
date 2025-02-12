import { TranslateList } from "./components/TranslateList";

const formatKebabCase = (text: string) => {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};

export default function Command({ arguments: { queryText } }: { arguments: { queryText?: string } }) {
  return <TranslateList formatFunction={formatKebabCase} queryText={queryText} />;
}
