import { TranslateList } from "./components/TranslateList";

const formatCamelCase = (text: string) => {
  return text
    .split(/[\s_]+/)
    .map((word, index) => {
      // 检查是否为全大写单词（可能是缩写）
      if (word.toUpperCase() === word && word.length > 1) {
        return index === 0 ? word.toLowerCase() : word;
      }
      // 普通单词的处理
      return index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
};

export default function Command({ arguments: { queryText } }: { arguments: { queryText?: string } }) {
  return <TranslateList formatFunction={formatCamelCase} queryText={queryText} />;
}
