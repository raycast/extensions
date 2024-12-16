# EasyEng AI - 技术实现文档

## 技术架构

### 1. 输入处理层
```typescript
// 输入处理流程
输入文本 → 防抖处理(300ms) → 文本分类 → 生成提示词 → API 请求 → 自动润色
```

- **文本分类器**：
  ```typescript
  // 中文检测
  function containsChinese(text: string): boolean {
    return /[\u4e00-\u9fa5]/.test(text);
  }

  // 单词检测
  function isWordCompletion(text: string): boolean {
    return /^[a-zA-Z]{2,}$/.test(text);
  }

  // 混合文本检测
  function isMixedText(text: string): boolean {
    return containsChinese(text) && /[a-zA-Z]+/.test(text);
  }
  ```

### 2. AI 处理层

#### AI 服务接口
```typescript
interface AIService {
  processWithAI(messages: Message[]): Promise<string>;
  getModelInfo(): ModelInfo;
  validateConfig(): void;
}

interface ModelInfo {
  name: string;
  provider: string;
  capabilities: {
    completion: boolean;
    translation: boolean;
    polish: boolean;
  };
}
```

#### Raycast AI 实现
```typescript
class RaycastAIService implements AIService {
  private readonly models = {
    [SupportedModel.OpenAIGPT4o]: AI.Model.OpenAI_GPT4,
    [SupportedModel.AnthropicClaudeSonnet]: AI.Model.Anthropic_Claude_Sonnet,
    // ... 其他模型映射
  };

  async processWithAI(messages: Message[]): Promise<string> {
    const preferences = getPreferenceValues<AIPreferences>();
    const model = this.models[preferences.aiModel];
    
    const response = await AI.ask(
      messages[messages.length - 1].content,
      { model }
    );
    
    return response.trim();
  }

  getModelInfo(): ModelInfo {
    return {
      name: "Raycast AI",
      provider: "Raycast",
      capabilities: {
        completion: true,
        translation: true,
        polish: true
      }
    };
  }

  validateConfig(): void {
    // Raycast AI 配置由 Raycast 平台管理
    return;
  }
}
```

#### OpenRouter 实现
```typescript
class OpenRouterService implements AIService {
  private readonly API_URL = "https://openrouter.ai/api/v1/chat/completions";
  private readonly MODEL = "google/gemini-flash-1.5";

  async processWithAI(messages: Message[]): Promise<string> {
    const { openrouterApiKey } = getAPIKeys();
    
    const response = await fetch(this.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterApiKey}`,
        "HTTP-Referer": "https://raycast.com/",
        "X-Title": "EasyEng AI"
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
        provider: {
          order: ["Google"],
          allow_fallbacks: false
        }
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  getModelInfo(): ModelInfo {
    return {
      name: "Gemini Flash",
      provider: "OpenRouter",
      capabilities: {
        completion: true,
        translation: true,
        polish: true
      }
    };
  }

  validateConfig(): void {
    const { openrouterApiKey } = getAPIKeys();
    if (!openrouterApiKey) {
      throw new Error("OpenRouter API key not configured");
    }
  }
}
```

#### AI 服务管理器
```typescript
class AIServiceManager {
  private services: Map<SupportedModel, AIService>;
  
  constructor() {
    this.services = new Map([
      [SupportedModel.OpenAIGPT4o, new RaycastAIService()],
      [SupportedModel.GeminiFlash, new OpenRouterService()]
    ]);
  }

  async process(model: SupportedModel, messages: Message[]): Promise<string> {
    const service = this.services.get(model);
    if (!service) {
      throw new Error(`Unsupported model: ${model}`);
    }

    service.validateConfig();
    return await service.processWithAI(messages);
  }

  getAvailableModels(): ModelInfo[] {
    return Array.from(this.services.values()).map(service => service.getModelInfo());
  }
}
```

#### 统一的提示词系统
```typescript
class PromptManager {
  private static readonly SYSTEM_PROMPTS = {
    completion: "You are a professional English writing assistant. Complete the word naturally and appropriately. Return exactly 3 completion suggestions.",
    translation: "You are a professional translator. Translate the mixed text to proper English, maintaining the original sentence structure.",
    polish: `You are a professional English writing assistant. Polish the text in three styles:
      1. Standard: Natural and professional
      2. Casual: Friendly and conversational
      3. Formal: Professional and academic`
  };

  static getPrompt(type: 'completion' | 'translation' | 'polish', input: string): Message[] {
    const systemContent = this.SYSTEM_PROMPTS[type];
    const userContent = this.getUserPrompt(type, input);

    return [
      { role: "system", content: systemContent },
      { role: "user", content: userContent }
    ];
  }

  private static getUserPrompt(type: string, input: string): string {
    switch (type) {
      case 'completion':
        return `Complete this word: "${input}". Return only the completions as a JSON array.`;
      case 'translation':
        return `Translate this Chinese-English mixed text to English: "${input}". Return only the translation.`;
      case 'polish':
        return `Polish this text: "${input}". Return the three versions in JSON format.`;
      default:
        throw new Error(`Unsupported prompt type: ${type}`);
    }
  }
}
```

#### 使用示例
```typescript
// 初始化服务
const aiManager = new AIServiceManager();

// 处理请求
async function processRequest(input: string, model: SupportedModel) {
  try {
    // 根据输入类型生成提示词
    let messages: Message[];
    if (isWordCompletion(input)) {
      messages = PromptManager.getPrompt('completion', input);
    } else if (containsChinese(input)) {
      messages = PromptManager.getPrompt('translation', input);
    } else {
      messages = PromptManager.getPrompt('polish', input);
    }

    // 处理请求
    const result = await aiManager.process(model, messages);
    
    // 如果不是润色请求，自动添加润色
    if (!isPolishRequest(input)) {
      const polishMessages = PromptManager.getPrompt('polish', result);
      const polished = await aiManager.process(model, polishMessages);
      return {
        original: result,
        polished: JSON.parse(polished)
      };
    }

    return { result };
  } catch (error) {
    handleError(error);
    throw error;
  }
}
```

### 3. 自动润色处理
```typescript
interface PolishResult {
  standard: string;
  casual: string;
  formal: string;
}

async function autoPolish(text: string): Promise<PolishResult> {
  const messages = getPolishPrompt(text);
  const response = await processWithModel(messages);
  return JSON.parse(response);
}

// 自动润色集成
async function processInput(input: string): Promise<ProcessResult> {
  let result: ProcessResult;
  
  if (isWordCompletion(input)) {
    const completions = await getWordCompletions(input);
    const polished = await autoPolish(completions[0]);
    result = {
      completions,
      polished
    };
  } else if (containsChinese(input)) {
    const translation = await translateMixedText(input);
    const polished = await autoPolish(translation);
    result = {
      translation,
      polished
    };
  }
  
  return result;
}
```

### 4. 状态管理
```typescript
interface ProcessResult {
  completions?: string[];
  translation?: string;
  polished: PolishResult;
}

interface WritingState {
  input: string;
  result?: ProcessResult;
  isLoading: boolean;
  error?: string;
}
```

## 错误处理

### 1. 输入验证
```typescript
function validateInput(text: string): boolean {
  if (!text.trim()) return false;
  if (text.length > 1000) throw new Error("Input too long");
  
  // 检查英文补全的最小长度
  if (/^[a-zA-Z]+$/.test(text) && text.length < 2) {
    return false;
  }
  
  return true;
}
```

### 2. API 错误处理
```typescript
try {
  const response = await fetch(OPENROUTER_API_URL, {
    // 请求配置
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.statusText}\n${errorText}`);
  }
  
  // 验证响应格式
  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Invalid API response format");
  }
} catch (error) {
  console.error('Request error:', error);
  handleError(error, "API request");
}
```

## 性能优化

### 1. 缓存策略
```typescript
const resultCache = new Map<string, ProcessResult>();
const CACHE_SIZE = 50;

function cacheResult(key: string, result: ProcessResult) {
  if (resultCache.size >= CACHE_SIZE) {
    const firstKey = resultCache.keys().next().value;
    resultCache.delete(firstKey);
  }
  resultCache.set(key, result);
}

async function getProcessResult(input: string): Promise<ProcessResult> {
  const cached = resultCache.get(input);
  if (cached) return cached;
  
  const result = await processInput(input);
  cacheResult(input, result);
  return result;
}
```

### 2. 防抖优化
```typescript
const debouncedProcess = debounce(async (text: string) => {
  if (!validateInput(text)) return;
  
  try {
    const result = await getProcessResult(text);
    updateState({ result });
  } catch (error) {
    handleError(error);
  }
}, 300);
```

## 测试实现

### 1. 测试辅助函数
```typescript
function createTestCase(input: string, expected: ProcessResult) {
  return {
    input,
    expected,
    async test() {
      const result = await processInput(input);
      expect(result).toMatchObject(expected);
    }
  };
}
```

### 2. 测试用例集
```typescript
describe('Input Processing', () => {
  // 补全测试
  test('Word completion with auto polish', async () => {
    const result = await processInput('imp');
    expect(result.completions).toHaveLength(3);
    expect(result.polished).toBeDefined();
  });

  // 翻译测试
  test('Mixed text translation with auto polish', async () => {
    const result = await processInput('我需要优化 system');
    expect(result.translation).toBeDefined();
    expect(result.polished).toBeDefined();
  });

  // 边界情况
  test('Handle special characters', async () => {
    const result = await processInput('CI/CD pip');
    expect(result.completions).toContain('pipeline');
  });
});
``` 