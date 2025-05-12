import { useState, useEffect, useRef } from "react";
import { ConversionResult } from "../types";
import { generateCurrentTimeItems } from "../utils/formatTime";

/**
 * 管理当前时间的更新和显示
 * @returns 当前时间相关的状态和控制函数
 */
export const useCurrentTime = () => {
  const [isShowingCurrentTime, setIsShowingCurrentTime] = useState<boolean>(true);
  const [currentTimeItems, setCurrentTimeItems] = useState<ConversionResult>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 设置当前时间和定时器
  useEffect(() => {
    // 初始显示当前时间
    if (isShowingCurrentTime) {
      setCurrentTimeItems(generateCurrentTimeItems());
    }

    // 清理之前的定时器(如果存在)
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 只有在显示当前时间模式下才启动定时器
    if (isShowingCurrentTime) {
      timerRef.current = setInterval(() => {
        setCurrentTimeItems(generateCurrentTimeItems());
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isShowingCurrentTime]);

  return {
    isShowingCurrentTime,
    setIsShowingCurrentTime,
    currentTimeItems,
  };
};
