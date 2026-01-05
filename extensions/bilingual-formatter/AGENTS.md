# Raycast Bilingual Formatter 开发指南

本文档旨在为开发代理（Agents）提供本项目（Raycast Bilingual Formatter）的代码规范、构建指令及最佳实践指南。请在进行任何代码修改前仔细阅读。

## 1. 项目概览

本项目是一个 Raycast 扩展，用于自动纠正中英混合排版的文字。
- **核心语言**: TypeScript
- **框架**: Raycast API, React (用于 UI)
- **包管理器**: npm

## 2. 构建与测试命令

请使用以下 npm 命令进行构建、检查和测试。

### 构建与开发
- **安装依赖**: `npm install`
- **构建生产版本**: `npm run build` (实际上运行 `ray build -e dist`)
- **开发模式**: `npm run dev` (实际上运行 `ray develop`，用于本地调试)

### 代码质量检查
- **Lint 检查**: `npm run lint` (运行 `ray lint`，基于 ESLint)
- **自动修复 Lint 问题**: `npm run fix` (运行 `ray lint --fix`)

### 测试
- **运行测试**: `npm run test` (运行 `ray test`)
  - *注意*: 目前 `tests` 目录下可能暂时没有测试文件。添加测试时，请参照 `src` 目录下的逻辑并在 `tests` 下创建对应的测试文件。
  - **单文件测试**: 如果使用了具体的测试框架（如 Vitest/Jest），请使用相应命令。目前项目配置默认使用 `ray test`。

## 3. 代码风格与规范

请严格遵守以下代码风格，保持与现有代码库的一致性。

### 3.1 文件与目录结构
- **目录结构**:
  - `src/commands/`: Raycast 命令入口文件 (如 `format-clipboard.ts`)
  - `src/correctors/`: 核心修正逻辑类 (如 `character-corrector.ts`)
  - `src/services/`: 服务层 (如 `formatter-service.ts`)
  - `src/utils/`: 工具函数和常量
- **命名约定**:
  - **文件名**: 使用 kebab-case (如 `base-corrector.ts`, `format-text.ts`)
  - **类名 (Class)**: 使用 PascalCase (如 `CharacterCorrector`, `FormatterService`)
  - **函数/方法**: 使用 camelCase (如 `handle`, `convertFullWidthToHalf`)
  - **变量**: 使用 camelCase
  - **常量**: 使用 UPPER_SNAKE_CASE (如 `FULL_WIDTH_CHARS`, `TOAST_DURATION_SUCCESS`)

### 3.2 TypeScript 规范
- **类型定义**: 显式声明函数参数和返回值的类型。
  ```typescript
  // 推荐
  handle(text: string): string { ... }
  ```
- **接口**: 优先使用 Interface 定义数据结构。
- **导出**:
  - 命令文件使用 `export default`。
  - 工具类和函数使用具名导出 (`export class ...`, `export function ...`)。

### 3.3 格式化规则 (Prettier/ESLint)
- **缩进**: 2 个空格
- **引号**: 使用双引号 `"`
- **分号**: 行尾使用分号 `;`
- **导入顺序**:
  1. 第三方库 (如 `@raycast/api`)
  2. 内部模块 (相对路径，如 `../services/formatter-service`)
  - *注意*: 请检查现有的 import 分组习惯。

### 3.4 错误处理与日志
- **错误捕获**: 在顶层命令函数中使用 `try-catch` 块。
- **错误处理**: 使用 `ErrorHandler` 服务统一处理错误。
  ```typescript
  try {
    // 业务逻辑
  } catch (error) {
    const errorMessage = ErrorHandler.handle(error as Error, "CommandName");
    showToast({ style: Toast.Style.Failure, title: "失败", message: errorMessage });
  }
  ```
- **日志**: 使用 `Logger` 工具类进行日志记录，而不是 `console.log`。
  ```typescript
  Logger.log("Process: Starting");
  ```

### 3.5 UI 交互
- 使用 Raycast 原生组件 (`showToast`, `Toast`, `Clipboard`)。
- 成功/失败操作应有明确的 Toast 反馈。

## 4. 特殊注意事项
- **配置路径**: 注意 `package.json` 和 `tsconfig.json` 中可能引用了 `sources` 目录，但实际代码位于 `src` 目录。在添加文件或修改配置时请留意此差异，通常应以文件系统实际存在的 `src` 为准。
- **常量管理**: 所有的标点符号映射、正则模式等硬编码内容应放在 `src/utils/constants.ts` 或 `src/utils/regex-patterns.ts` 中。

## 5. 常用代码片段示例

### 命令入口模板
```typescript
import { showToast, Toast } from "@raycast/api";
import { Logger } from "../utils/logger";

export default async function Command() {
  try {
    Logger.log("Command: Start");
    // 逻辑...
    showToast({ style: Toast.Style.Success, title: "成功" });
  } catch (error) {
    // 错误处理...
  }
}
```

### 修正器类模板
```typescript
import { BaseCorrector } from "./base-corrector";

export class NewCorrector extends BaseCorrector {
  handle(text: string): string {
    // 实现修正逻辑
    return text;
  }
}
```
