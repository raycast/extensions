import { useEffect, useState } from "react";
import { FILL_DELAY_MS } from "@/core/ui/shared/progressive-list";

// 逐步显示列表：首帧只渲染前 INITIAL_ITEM_COUNT 项，首帧之后补全；一打字也立刻补全。
// 依赖里带 showAll：StrictMode 模拟卸载后重新挂载时会重新设置计时器，不会被清掉后再也不设。
export function useProgressiveList(count: number) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (showAll || count === 0) return;
    const timer = setTimeout(() => setShowAll(true), FILL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showAll, count]);

  return { showAll, showAllNow: () => setShowAll(true) };
}
