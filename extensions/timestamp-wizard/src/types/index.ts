/**
 * 列表项类型定义
 */
export interface TimeItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  accessory?: string;
  value?: string;
}

/**
 * 时间转换结果类型
 */
export type ConversionResult = TimeItem[];
