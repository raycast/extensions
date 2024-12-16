# EasyEng AI - 功能实现文档

## 一、核心功能

### 1. 实时输入处理
- **实现位置**: `src/services/wordCompletion.ts`
- **处理流程**:
  ```typescript
  用户输入 → 防抖(1000ms) → 文本分类 → AI处理 → 展示结果
  ```
- **文本分类器**:
  ```typescript
  // 中文检测
  containsChinese(text: string): boolean
  // 英文补全检测
  needsCompletion(text: string): boolean
  // 单词数量检测
  countWords(text: string): number
  ```

### 2. AI 服务调用
- **实现位置**: `src/services/raycast.ts`
- **模型配置**:
  ```typescript
  private modelMapping = {
    'openai-gpt-4o-mini': AI.Model["OpenAI_GPT4o-mini"]
  }
  ```
- **请求处理**:
  ```typescript
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 1. 验证模型
    // 2. 构建请求
    // 3. 发送请求
    // 4. 处理响应
  }
  ```

### 3. 提示词系统
- **实现位置**: `src/utils/prompts.ts`
- **主要模板**:
  1. 翻译提示词:
  ```typescript
  {
    role: "system",
    content: "You are a professional English-Chinese translator..."
  }
  ```
  2. 补��提示词:
  ```typescript
  {
    role: "system",
    content: "You are a helpful English writing assistant..."
  }
  ```

## 二、功能实现细节

### 1. 翻译功能
- **触发条件**: 输入包含中文字符
- **处理流程**:
  1. 检测中文: `containsChinese()`
  2. 生成翻译提示词
  3. 调用 AI 获取多种风格翻译
  4. 解析响应返回数组:
     - 直接翻译
     - 专业风格
     - 口语风格
     - 学术风格

### 2. 单词补全
- **触发条件**: 
  - 纯英文输入
  - 长度 >= 2 字符
- **处理策略**:
  1. 单词场景 (≤2词):
     - 返回 3 个补全建议
  2. 上下文场景 (>2词):
     - 返回 2 个补全建议

### 3. 性能优化
- **防抖处理**:
  ```typescript
  debounce(async (text: string) => {
    // 处理逻辑
  }, 1000)
  ```
- **请求优化**:
  1. 输入验证
  2. 长度限制 (1000字符)
  3. 结果缓存

### 4. 错误处理
- **实现位置**: `src/utils/errorHandler.ts`
- **处理策略**:
  1. 控制台日志
  2. 用户提示
  3. 错误上报

## 三、架构设计

### 1. 服务层
```typescript
BaseService
  ├── RaycastService     // Raycast AI 实现
  └── OpenAIService      // OpenAI 实现(预留)
```

### 2. 工具层
```typescript
utils/
  ├── types.ts          // 类型定义
  ├── prompts.ts        // 提示词模板
  ├── helpers.ts        // 辅助函数
  └── errorHandler.ts   // 错误处理
```

### 3. 配置层
```typescript
config/
  └── aiConfig.ts       // AI 服务配置
```

## 四、扩展性设计

### 1. 服务扩展
- **工厂模式**: `AIServiceFactory`
- **配置驱动**: `aiConfig.ts`
- **接口统一**: `BaseService`

### 2. 能力扩展
- **模型配置**:
  ```typescript
  interface AIModelConfig {
    id: string;
    capabilities: {
      chat: boolean;
      completion: boolean;
      translation: boolean;
    }
  }
  ```

### 3. 提示词扩展
- **模板化设计**
- **风格可配置**
- **多语言支持**

## 五、使用建议

### 1. 最佳实践
- 输入控制在 1000 字符以内
- 等待 1 秒后再期待结果
- 使用快捷键提高效率

### 2. 性能考虑
- 避免频繁输入
- 合理使用复制粘贴
- 注意网络状态

### 3. 开发建议
- 遵循类型定义
- 保持错误处理一致性
- 维护日志系统
- 注意代码复用
