import type { ValidationResult, SlugValidationRules } from "./types";
import { isSlugUsed } from "./cache";

/**
 * 函数签名：
 * value: string | undefined - 参数可以是字符串或 undefined
 * value is string - 这是类型谓词（type predicate），告诉 TypeScript 如果函数返回 true，那么 value 的类型就是 string
 *
 * 函数实现：
 * typeof value === 'string' - 首先检查 value 是否为字符串类型（排除 undefined）
 * value.length > 0 - 然后检查字符串是否非空
 */
function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

export const validateSlugFormat = (value: string | undefined): ValidationResult => {
  if (!isNonEmptyString(value)) {
    return {
      isValid: false,
      message: "Slug is required",
    };
  }

  // 检查格式是否符合要求
  if (!value.match(/^[a-zA-Z0-9-_]+$/)) {
    return {
      isValid: false,
      message: "Slug can only contain letters, numbers, hyphens and underscores",
    };
  }

  // 添加缓存验证
  // 1. 在 shorten-link 命令加载时获取 slugs 并更新到 Cache
  // 2. 在表单验证时同步地从 Cache 读取进行验证(因为 Raycast 的表单验证不支持异步)
  if (isSlugUsed(value)) {
    return {
      isValid: false,
      message: "This slug is already taken. Please choose another one.",
    };
  }

  return { isValid: true };
};

export const slugValidation: SlugValidationRules = {
  format: validateSlugFormat,
};
