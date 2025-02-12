import { TranslateList } from "./components/TranslateList";

const formatPascalCase = (text: string) => {
  return text
    .split(/[\s_]+/)
    .map((word) => {
      // 检查是否为全大写单词（可能是缩写）
      if (word.toUpperCase() === word && word.length > 1) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
};

export default function Command({ arguments: { queryText } }: { arguments: { queryText?: string } }) {
  return <TranslateList formatFunction={formatPascalCase} queryText={queryText} />;
}
