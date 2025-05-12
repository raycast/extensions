import { useState } from "react";
import { ConversionResult } from "../types";
import { parseTimestamp, parseTimeString, isTimestamp } from "../utils/parseTime";
import { timestampToDateFormats, dateToTimestamps } from "../utils/formatTime";

/**
 * 时间转换hook
 * @returns 时间转换相关的状态和函数
 */
export const useTimeConverter = () => {
  const [conversionResult, setConversionResult] = useState<ConversionResult>([]);

  /**
   * 处理时间转换
   * @param input 用户输入的字符串
   * @returns 转换是否成功
   */
  const convertTime = (input: string): boolean => {
    if (!input.trim()) {
      return false;
    }

    // 判断输入类型并处理
    if (isTimestamp(input)) {
      // 解析时间戳
      const timestampDate = parseTimestamp(input);
      if (timestampDate) {
        setConversionResult(timestampToDateFormats(timestampDate));
        return true;
      }
    } else {
      // 解析时间字符串
      const timeDate = parseTimeString(input);
      if (timeDate) {
        setConversionResult(dateToTimestamps(timeDate));
        return true;
      }
    }

    // 无法解析，显示错误
    if (input.trim().length > 3) {
      setConversionResult([
        {
          id: "invalid-input",
          icon: "exclamationmark",
          title: "Invalid Input",
          subtitle: "Please enter a valid timestamp or date format",
          accessory: "",
        },
      ]);
    } else {
      setConversionResult([]);
    }

    return false;
  };

  return {
    conversionResult,
    convertTime,
  };
};
