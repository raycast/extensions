# Raycast Extensions 开发深度研究报告

**生成日期**: 2025年12月19日
**研究范围**: Raycast 扩展开发完整技术栈
**报告类型**: 技术研究与开发指南

---

## 目录

1. [概述](#概述)
2. [Raycast 扩展生态系统](#raycast-扩展生态系统)
3. [技术架构](#技术架构)
4. [开发环境与工具链](#开发环境与工具链)
5. [核心 API 详解](#核心-api-详解)
6. [UI 组件系统](#ui-组件系统)
7. [开发最佳实践](#开发最佳实践)
8. [扩展发布流程](#扩展发布流程)
9. [高级特性](#高级特性)
10. [社区与资源](#社区与资源)
11. [总结与建议](#总结与建议)

---

## 概述

Raycast 是一个强大的生产力工具和启动器，支持 macOS、Windows 和 iOS 平台。它允许用户通过几次按键控制工具，消除了日常工作流程中的上下文切换。

Raycast 扩展开发基于以下核心技术栈：
- **React** - 用于构建用户界面
- **Node.js** - 运行时环境
- **TypeScript** - 类型安全的 JavaScript
- **@raycast/api** - 官方 API 库
- **@raycast/utils** - 实用工具库

### 扩展类型

Raycast 支持两种主要的扩展形式：

1. **完整扩展 (Full Extensions)**
   - 使用 React + TypeScript 构建
   - 丰富的 UI 组件
   - 支持复杂的交互逻辑
   - 可发布到 Raycast Store

2. **脚本命令 (Script Commands)**
   - 快速执行自定义脚本
   - 支持多种脚本语言
   - 轻量级解决方案
   - 本地使用

---

## Raycast 扩展生态系统

### 官方资源

- **官方扩展仓库**: [raycast/extensions](https://github.com/raycast/extensions)
  - 包含 15,000+ 个提交
  - 官方维护的扩展集合
  - 丰富的示例和文档

- **开发文档**: [developers.raycast.com](https://developers.raycast.com)
  - 完整的 API 参考
  - 详细的使用指南
  - 代码示例和教程

### 社区扩展

社区维护的扩展仓库（基于 GitHub 搜索结果）：

| 仓库 | 描述 | 活跃度 |
|------|------|--------|
| raycast/extensions | 官方扩展仓库 | 极高 (15,091 commits) |
| casassg/raycast-extensions | 社区扩展集合 | 高 (8,260 commits) |
| lndgalante/raycast-extensions | 社区扩展集合 | 高 (10,994 commits) |
| rajmasha/raycast-extensions | 社区扩展集合 | 中 (6,589 commits) |

### 知名扩展示例

- **Supernotes Extension** - 笔记应用集成
- **Airtable Extension** - 数据库管理
- **raycast-g4f** - 免费 AI 模型访问
- **raycast-explorer** - 文件系统浏览

---

## 技术架构

### 项目结构

标准的 Raycast 扩展项目结构：

```
my-extension/
├── assets/              # 静态资源（图标等）
├── src/                 # 源代码目录
│   ├── index.ts         # 入口文件
│   └── command.ts       # 命令实现
├── metadata/            # 扩展元数据
├── package.json         # 项目配置
├── tsconfig.json        # TypeScript 配置
├── .eslintrc.json       # ESLint 配置
├── .prettierrc          # Prettier 配置
└── raycast-env.d.ts     # Raycast 类型定义
```

### 核心依赖

```json
{
  "dependencies": {
    "@raycast/api": "^1.0.0",
    "@raycast/utils": "^1.0.0",
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 版本兼容性

- **Raycast 版本**: 最低要求 v20.18.1
- **平台支持**:
  - macOS (完全支持)
  - Windows (进行中，部分功能受限)
  - Linux (未官方支持)

---

## 开发环境与工具链

### 环境要求

1. **Node.js**: 18.x 或更高版本
2. **npm**: 9.x 或更高版本
3. **Raycast**: 最新版本

### 开发工具

#### ESLint 配置

Raycast 提供官方的 ESLint 配置：

```bash
npm install @raycast/eslint-config --save-dev
```

配置 `.eslintrc.json`:

```json
{
  "extends": ["@raycast/eslint-config"]
}
```

#### Prettier 配置

```json
{
  "printWidth": 100,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

### 构建命令

```bash
npm run build      # 构建扩展
npm run dev        # 开发模式
npm run publish    # 发布扩展
```

---

## 核心 API 详解

### @raycast/api

核心 API 包，提供基础功能。

#### 主要组件

1. **List** - 列表视图
   ```typescript
   import { List } from "@raycast/api";

   export default function Command() {
     return (
       <List>
         <List.Item title="Item 1" />
         <List.Item title="Item 2" />
       </List>
     );
   }
   ```

2. **Detail** - 详情视图
   ```typescript
   import { Detail } from "@raycast/api";

   const markdown = `
   # 标题

   这是一段 **Markdown** 内容。
   `;

   export default function Command() {
     return <Detail markdown={markdown} />;
   }
   ```

3. **Form** - 表单组件
   ```typescript
   import { Form } from "@raycast/api";

   export default function Command() {
     return (
       <Form>
         <Form.TextField id="name" title="Name" />
         <Form.TextArea id="description" title="Description" />
       </Form>
     );
   }
   ```

### @raycast/utils

实用工具库，提供高级功能。

#### 核心 Hooks

1. **useFetch** - 数据获取
   ```typescript
   import { useFetch } from "@raycast/utils";

   const { isLoading, data, revalidate } = useFetch(url);
   ```

2. **useExec** - 执行命令
   ```typescript
   import { useExec } from "@raycast/utils";

   const { isLoading, data } = useExec("brew", ["list"]);
   ```

3. **mutate** - 乐观更新
   ```typescript
   import { mutate } from "@raycast/utils";

   await mutate(queryKey, {
     optimisticUpdate: (data) => newData,
     rollbackOnError: true,
   });
   ```

#### 实用工具

1. **showToast** - 显示提示
   ```typescript
   import { showToast, Toast } from "@raycast/utils";

   const toast = await showToast({
     style: Toast.Style.Animated,
     title: "Loading..."
   });
   ```

2. **OAuth 工具** (v1.11.0+)
   - `authorize` - 授权
   - `refreshToken` - 刷新令牌

3. **executeSQL** (v1.18.0+)
   ```typescript
   import { executeSQL } from "@raycast/utils";

   const result = await executeSQL("SELECT * FROM table");
   ```

4. **runPowerShellScript** (v2.0.0+)
   ```typescript
   import { runPowerShellScript } from "@raycast/utils";

   await runPowerShellScript("Get-Process");
   ```

---

## UI 组件系统

### List 组件

#### 基本用法

```typescript
<List>
  <List.Item
    title="Item Title"
    subtitle="Item Subtitle"
    icon="icon.png"
  />
</List>
```

#### List.Dropdown

```typescript
<List
  searchBarAccessory={
    <List.Dropdown tooltip="Select Option">
      <List.Dropdown.Item title="Option 1" value="1" />
      <List.Dropdown.Item title="Option 2" value="2" />
    </List.Dropdown>
  }
>
  <List.Item title="Item 1" />
</List>
```

### Detail 组件

#### 基础详情页

```typescript
<Detail
  markdown={markdown}
  navigationTitle="Page Title"
  metadata={
    <Detail.Metadata>
      <Detail.Metadata.Label title="Key" text="Value" />
      <Detail.Metadata.Separator />
    </Detail.Metadata>
  }
/>
```

#### 完整示例

```typescript
import { Detail } from "@raycast/api";

const markdown = `
# Pikachu

![](https://assets.pokemon.com/assets/cms2/img/pokedex/full/025.png)

Pikachu that can generate powerful electricity have cheek sacs that are extra soft and super stretchy.
`;

export default function Main() {
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Pikachu"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Height" text={`1' 04"`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Weight" text="13.2 lbs" />
        </Detail.Metadata>
      }
    />
  );
}
```

### Form 组件

#### TextArea 示例

**非受控模式**:
```typescript
export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values) => console.log(values)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="description" defaultValue={DESCRIPTION} />
    </Form>
  );
}
```

**受控模式**:
```typescript
export default function Command() {
  const [description, setDescription] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={(values) => console.log(values)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
```

#### Form 组件类型

- `Form.TextField` - 文本输入框
- `Form.TextArea` - 多行文本输入框
- `Form.PasswordField` - 密码输入框
- `Form.Checkbox` - 复选框
- `Form.Dropdown` - 下拉选择框
- `Form.DatePicker` - 日期选择器

### ActionPanel

```typescript
<ActionPanel>
  <Action title="Action 1" onAction={() => {}} />
  <Action.CopyToClipboard title="Copy" content="text" />
  <Action.OpenInBrowser title="Open" url="https://example.com" />
</ActionPanel>
```

---

## 开发最佳实践

### 1. 项目初始化

使用官方模板：
```bash
npm create raycast@latest my-extension
```

### 2. TypeScript 配置

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "lib": ["ES2021", "DOM"],
    "module": "ESNext",
    "target": "ES2021",
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 3. 性能优化

#### 使用 React.memo

```typescript
const ListItem = React.memo(({ item }: { item: Item }) => {
  return <List.Item title={item.title} />;
});
```

#### 懒加载

```typescript
const LazyComponent = React.lazy(() => import("./LazyComponent"));

export default function Command() {
  return (
    <React.Suspense fallback={<List isLoading />}>
      <LazyComponent />
    </React.Suspense>
  );
}
```

### 4. 错误处理

```typescript
try {
  const data = await fetchData();
  // 处理数据
} catch (error) {
  showToast({
    style: Toast.Style.Failure,
    title: "Error",
    message: error.message,
  });
}
```

### 5. 状态管理

使用 React hooks：
```typescript
export default function Command() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  // 业务逻辑
}
```

---

## 扩展发布流程

### 1. 发布前准备

#### 验证扩展

```bash
npm run build
```

确保构建无错误。

#### 检查 package.json

```json
{
  "name": "my-extension",
  "title": "My Extension",
  "author": "your-username",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/my-extension.git"
  },
  "engines": {
    "raycast": ">=1.0.0"
  },
  "main": "src/index.ts",
  "keywords": ["raycast", "extension"],
  "icon": "icon.png",
  "commands": [
    {
      "name": "my-command",
      "title": "My Command",
      "description": "Description of my command"
    }
  ],
  "preferences": [
    {
      "name": "apiKey",
      "type": "password",
      "title": "API Key",
      "required": true
    }
  ],
  "platforms": ["macOS", "macOS"] // Windows support coming soon
}
```

#### 平台限制

- 如果使用平台特定 API，需要在 `platforms` 字段中明确指定
- 建议仅在需要时限制平台

### 2. 发布到 Store

#### 自动发布

```bash
npm run publish
```

此命令将：
1. 验证扩展
2. 构建扩展
3. 创建 GitHub PR 到 raycast/extensions
4. 提交信息会被压缩

#### 手动发布

如果需要更多控制：

1. Fork raycast/extensions 仓库
2. 在 `extensions/` 目录创建新文件夹
3. 添加扩展文件
4. 提交 PR

### 3. Store 审核流程

#### 审核要求

- **代码质量**: 遵循 ESLint 规则
- **功能完整**: 所有功能正常工作
- **文档齐全**: README 完整描述
- **用户体验**: 界面友好，操作直观

#### 审核时间

通常需要 3-7 个工作日

#### 常见拒绝原因

1. 使用过时的 API 版本
2. 缺少错误处理
3. 性能问题
4. 文档不完整
5. 重复功能

### 4. 更新扩展

#### 推送更新

```bash
npm run publish
```

#### 版本管理

在 `package.json` 中更新版本：

```json
{
  "version": "1.1.0"
}
```

---

## 高级特性

### AI 扩展

Raycast 支持 AI 驱动的扩展：

#### AI 指令配置

```json
{
  "ai": {
    "instructions": "When you don't know the user's first name, ask for it."
  }
}
```

#### 核心概念

- **Instructions** - 全局 AI 行为指导
- **Context** - 对话上下文
- **Capabilities** - AI 能力范围

### OAuth 认证

集成第三方服务：

```typescript
import { OAuthClient } from "@raycast/utils";

const client = new OAuthClient({
  clientId: "your-client-id",
  scope: "read write",
});

const { token } = await client.authorize();
```

### 本地存储

```typescript
import { LocalStorage } from "@raycast/utils";

await LocalStorage.setItem("key", "value");
const value = await LocalStorage.getItem("key");
```

### 自定义 Hooks

创建可复用逻辑：

```typescript
function useCustomHook() {
  const [state, setState] = useState();

  useEffect(() => {
    // 副作用
  }, []);

  return { state, setState };
}
```

---

## 社区与资源

### 官方资源

1. **开发文档**: https://developers.raycast.com
2. **API 参考**: https://developers.raycast.com/api-reference
3. **GitHub 仓库**: https://github.com/raycast/extensions
4. **社区论坛**: Raycast Community

### 学习资源

1. **官方示例**: extensions/examples/
2. **教程视频**: YouTube/Raycast
3. **博客文章**: Raycast Blog

### 社区贡献

- **扩展开发**: 贡献自己的扩展
- **问题反馈**: 在 GitHub 提交 Issue
- **文档改进**: 完善官方文档

---

## 总结与建议

### Raycast 扩展开发的优势

1. **技术栈成熟**: 基于 React + TypeScript，开发者门槛低
2. **工具完善**: 官方提供完整的开发工具链
3. **生态活跃**: 15,000+ commits 的活跃社区
4. **文档丰富**: 详细的官方文档和示例
5. **发布简单**: 一键发布到 Store

### 适用场景

- **生产力工具**: 快速访问常用功能
- **系统集成**: 与第三方服务集成
- **工作流自动化**: 简化重复任务
- **数据查询**: 快速检索信息

### 开发建议

1. **从简单开始**: 使用官方模板，先实现基础功能
2. **遵循最佳实践**: 使用 ESLint、TypeScript、错误处理
3. **性能优化**: 使用 React.memo、懒加载
4. **用户体验**: 清晰的界面设计、直观的操作流程
5. **测试充分**: 手动测试各种场景
6. **文档完善**: 提供清晰的 README 和使用说明

### 未来发展趋势

1. **Windows 支持**: 正在进行中，将支持 Windows 平台
2. **AI 增强**: 更多 AI 驱动的功能
3. **性能提升**: 持续优化启动速度和运行性能
4. **生态扩展**: 更多官方和第三方扩展

### 结论

Raycast 扩展开发是一个成熟、高效的开发生态系统。通过 React + TypeScript 的现代技术栈，开发者可以快速构建高质量的生产力工具。官方提供的完整工具链和活跃的社区支持，使得开发过程顺畅且富有成就感。

无论是个人使用还是商业产品，Raycast 扩展都是一个值得投入的技术方向。

---

**参考文献**:

1. [Raycast API Documentation](https://developers.raycast.com)
2. [Raycast Extensions Repository](https://github.com/raycast/extensions)
3. [Context7 Raycast Library Documentation](/websites/developers_raycast)
4. [Web Search Results - Raycast Extensions 2025]

**报告完成日期**: 2025年12月19日
