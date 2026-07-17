import pinyin from "tiny-pinyin";

// Define the structure of the item
interface Item {
  data: string;
  remark?: string;
}

// Function to filter commands based on the keyword
export const commandFilter = (item: Item, keyword: string): boolean => {
  keyword = keyword.trim().toLowerCase();
  const remark = item.remark?.trim().toLowerCase() || "";
  const data = item.data.trim().toLowerCase();

  if (data === "") {
    return false;
  }

  if (!keyword) {
    return true;
  }

  const keywordArray = keyword.split(" ").filter((word) => word !== "");
  if (isKeywordsInData(keywordArray, data) || isKeywordsInData(keywordArray, remark)) {
    return true;
  }

  if (!containsChineseCharacters(data) && !containsChineseCharacters(remark)) {
    return false;
  }

  const dataPinyinWords = convertToPinyinWords(data);
  const remarkPinyinWords = convertToPinyinWords(remark);

  if (isKeywordsInData(keywordArray, dataPinyinWords) || isKeywordsInData(keywordArray, remarkPinyinWords)) {
    return true;
  }

  const dataPinyinInitials = getPinyinInitials(data);
  const remarkPinyinInitials = getPinyinInitials(remark);
  if (isKeywordsInData(keywordArray, dataPinyinInitials) || isKeywordsInData(keywordArray, remarkPinyinInitials)) {
    return true;
  }

  return false;
};

const getPinyinInitials = (str: string): string => {
  const pinyinArray = pinyin.parse(str);
  return pinyinArray
    .map((pinyin: { target: string }) => pinyin.target[0])
    .join("")
    .toLowerCase();
};

const isKeywordsInData = (keyword: string[], data: string): boolean => {
  return keyword.every((f) => data.includes(f));
};

const convertToPinyinWords = (str: string): string => {
  return pinyin
    .parse(str)
    .map((pinyin: { target: string }) => pinyin.target)
    .join("")
    .toLowerCase();
};

const containsChineseCharacters = (str: string): boolean => {
  return /[\u4e00-\u9fa5]/.test(str);
};
