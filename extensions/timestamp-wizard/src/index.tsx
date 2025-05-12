import { List } from "@raycast/api";
import { useState } from "react";
import { TimeItem } from "./components/TimeItem";
import { useCurrentTime } from "./hooks/useCurrentTime";
import { useTimeConverter } from "./hooks/useTimeConverter";
import { ConversionResult } from "./types";

/**
 * 主命令组件
 */
export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const { isShowingCurrentTime, setIsShowingCurrentTime, currentTimeItems } = useCurrentTime();
  const { conversionResult, convertTime } = useTimeConverter();

  // 处理搜索文本变化
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);

    // 如果输入为空，切换到显示当前时间模式
    if (!text.trim()) {
      setIsShowingCurrentTime(true);
      return;
    }

    // 如果有输入，关闭当前时间模式，进行转换
    setIsShowingCurrentTime(false);
    convertTime(text);
  };

  // 确定当前应该显示哪些项目
  const displayItems: ConversionResult = isShowingCurrentTime ? currentTimeItems : conversionResult;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Enter timestamp or date (e.g.: 1715558400 or 2024-05-13 15:00)"
      throttle={false}
    >
      {displayItems.map((item) => (
        <TimeItem key={item.id} item={item} />
      ))}
    </List>
  );
}
