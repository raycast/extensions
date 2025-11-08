# Architecture & Development Guide

This document provides a comprehensive overview of Promptify's architecture, design patterns, and development practices.

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Raycast UI    │    │   Core Logic    │    │  AI Providers   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  Commands   │◄├────┤ │  Presets    │ │    │ │   Ollama    │ │
│ │             │ │    │ │             │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │UI Components│ │    │ │  Storage    │ │    │ │   OpenAI    │ │
│ │             │ │    │ │             │ │    │ │  (Future)   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                          ┌─────────────────┐
                          │ Local Storage   │
                          │ (Raycast API)   │
                          └─────────────────┘
```

### Core Components

#### 1. Commands Layer (`src/commands/`)
- Entry points for Raycast commands
- Handle user interactions and coordinate between UI and core logic
- Four main commands: General, Images, Code, History

#### 2. Core Logic (`src/core/`)
- **Types**: TypeScript interfaces and type definitions
- **Presets**: Built-in prompt templates and preset management
- **Storage**: Data persistence using Raycast's LocalStorage API
- **Config**: Application configuration and preferences
- **Constants**: Application-wide constants and error messages

#### 3. Providers (`src/providers/`)
- **Base**: Abstract provider interface and common functionality
- **Ollama**: Ollama HTTP API integration
- **Index**: Provider factory and configuration

#### 4. UI Layer (`src/ui/`)
- **Components**: Reusable React components
- **Hooks**: Custom React hooks for common functionality
- **Utils**: UI-specific utilities (validation, formatting)

#### 5. Utils (`src/utils/`)
- **Errors**: Custom error types and error handling
- **Helpers**: General utility functions

## 🏛️ Design Patterns

### 1. Provider Pattern

The AI provider system uses the Strategy pattern for pluggable AI services:

```typescript
// Base provider interface
export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  abstract enhance(prompt: string, preset: PresetConfig): Promise<string>;
  abstract isAvailable(): Promise<boolean>;
}

// Concrete implementation
export class OllamaProvider extends BaseProvider {
  name = 'Ollama';
  
  async enhance(prompt: string, preset: PresetConfig): Promise<string> {
    // Implementation specific to Ollama
  }
}

// Factory pattern for provider selection
export async function getProvider(): Promise<AIProvider> {
  const preferences = getPreferenceValues<ProviderPreferences>();
  
  switch (preferences.provider) {
    case 'ollama':
      return new OllamaProvider();
    case 'openai':
      return new OpenAIProvider(); // Future implementation
    default:
      return new OllamaProvider();
  }
}
```

### 2. Hook Pattern

Custom React hooks encapsulate common functionality:

```typescript
// Clipboard management
export function useClipboard() {
  const [clipboardText, setClipboardText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClipboardText();
  }, []);

  // Implementation...
  return { clipboardText, isLoading, error, refreshClipboard };
}

// Provider management
export function useProvider() {
  const [provider, setProvider] = useState<AIProvider | null>(null);
  const [isProviderReady, setIsProviderReady] = useState(false);
  
  // Implementation...
  return { provider, isProviderReady, providerError, refreshProvider };
}
```

### 3. Command Pattern

Commands follow a consistent pattern:

```typescript
export default function EnhancePromptGeneral() {
  // State management
  const [output, setOutput] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom hooks for dependencies
  const { clipboardText, isLoading: clipboardLoading, error: clipboardError } = useClipboard();
  const { provider, isProviderReady, providerError } = useProvider();
  const { saveToHistory, exportAsJson, isSaving } = useHistory();
  
  // Enhancement logic
  const enhancePrompt = async () => {
    // Implementation...
  };

  // Render with consistent UI
  return (
    <PromptPreview
      input={clipboardText}
      output={output}
      isLoading={isLoading}
      error={finalError}
      presetName={preset.name}
      actions={<PromptActions {...actionProps} />}
    />
  );
}
```

### 4. Error Handling Pattern

Typed errors with specific error classes:

```typescript
export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ClipboardError extends AppError {
  constructor(message: string) {
    super(message, 'CLIPBOARD_ERROR');
  }
}

export class ProviderError extends AppError {
  constructor(message: string, public provider?: string) {
    super(message, 'PROVIDER_ERROR');
  }
}

// Usage in commands
try {
  const result = await provider.enhance(prompt, preset);
} catch (err) {
  if (err instanceof ProviderError) {
    // Handle provider-specific errors
  } else if (err instanceof NetworkError) {
    // Handle network errors
  }
}
```

## 📦 Module Organization

### Dependency Flow

```
Commands → UI Components → Core Logic → Providers
    ↓           ↓              ↓          ↓
 Raycast    React Hooks    Storage    External APIs
```

### Import Structure

```typescript
// Commands import from UI and Core
import { useClipboard, useProvider, PromptPreview } from '../ui';
import { BUILT_IN_PRESETS, PresetManager } from '../core/presets';

// UI imports from Core and Utils
import { SUCCESS_MESSAGES } from '../../core/constants';
import { formatTimeAgo } from '../../utils/helpers';

// Core imports from Utils only
import { generateId } from '../utils/helpers';
import { StorageError } from '../utils/errors';
```

### File Naming Conventions

```
Commands:        enhance-prompt-general.tsx
Components:      PromptPreview.tsx (PascalCase)
Hooks:          useClipboard.ts (camelCase)
Utils:          formatting.ts (lowercase)
Types:          types.ts (lowercase)
Constants:      constants.ts (lowercase)
```

## 🛠️ Development Setup

### Prerequisites

```bash
# Node.js 18+ and npm
node --version  # Should be 18+
npm --version

# Raycast CLI
npm install -g @raycast/api

# Development tools
npm install -g typescript
npm install -g prettier
npm install -g eslint
```

### Local Development

```bash
# Clone and setup
git clone https://github.com/Thomas-Basadonne/promptify-raycast.git
cd promptify-raycast
npm install

# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Lint and format
npm run lint
npm run fix-lint
```

### Development Workflow

1. **Feature Development**:
   ```bash
   git checkout -b feature/new-preset-type
   npm run dev  # Start development mode
   # Make changes
   npm run lint  # Check code quality
   git commit -m "feat: add new preset type"
   ```

2. **Testing Changes**:
   - Raycast auto-reloads in development mode
   - Test all affected commands
   - Verify error handling paths
   - Check TypeScript compilation

3. **Code Quality**:
   ```bash
   npm run lint        # ESLint checks
   npm run fix-lint    # Auto-fix issues
   npm run build       # TypeScript compilation
   ```

## 🔧 Technical Implementation

### Raycast Integration

#### Command Registration
```json
// package.json
{
  "commands": [
    {
      "name": "enhance-prompt-general",
      "title": "Enhance Prompt (General)",
      "mode": "view",
      "description": "Structure any prompt with clear objectives and context"
    }
  ]
}
```

#### Preferences System
```json
{
  "preferences": [
    {
      "name": "provider",
      "title": "AI Provider",
      "type": "dropdown",
      "required": true,
      "default": "ollama",
      "data": [
        { "title": "Ollama (Local)", "value": "ollama" }
      ]
    }
  ]
}
```

### Storage Architecture

#### Data Models
```typescript
interface HistoryItem {
  id: string;
  timestamp: number;
  presetId: string;
  input: string;
  output: string;
  metadata: {
    provider: string;
    model?: string;
    processingTime: number;
  };
}

interface PresetConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tags: string[];
  isBuiltIn: boolean;
  examples?: PresetExample[];
}
```

#### Storage Operations
```typescript
export class StorageManager {
  static async saveToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<string> {
    const id = generateId('hist');
    const historyItem: HistoryItem = { ...item, id, timestamp: Date.now() };
    
    const history = await this.getHistory();
    const updatedHistory = [historyItem, ...history].slice(0, 100);
    
    await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
    return id;
  }
}
```

### AI Provider Integration

#### Ollama HTTP API
```typescript
async enhance(prompt: string, preset: PresetConfig): Promise<string> {
  const requestBody = {
    model: ollamaModel,
    messages: [{ role: 'user', content: this.formatPrompt(prompt, preset) }],
    stream: false
  };

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new ProviderError(`Ollama request failed: ${response.status}`);
  }

  const data = await response.json() as OllamaChatResponse;
  return data.message.content.trim();
}
```

## 🧪 Testing Strategy

### Unit Testing
```typescript
// Example test structure
describe('PresetManager', () => {
  test('should validate prompt correctly', () => {
    const result = PresetManager.validatePrompt('Valid prompt');
    expect(result.isValid).toBe(true);
  });

  test('should reject empty prompts', () => {
    const result = PresetManager.validatePrompt('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('clipboard');
  });
});
```

### Integration Testing
```typescript
// Test full enhancement workflow
describe('Enhancement Workflow', () => {
  test('should enhance prompt end-to-end', async () => {
    const provider = new OllamaProvider();
    const preset = BUILT_IN_PRESETS.general;
    
    const result = await provider.enhance('Write about dogs', preset);
    
    expect(result).toContain('🎯 Objective');
    expect(result).toContain('📋 Context');
    expect(result.length).toBeGreaterThan(100);
  });
});
```

### Manual Testing Checklist
- [ ] All commands launch successfully
- [ ] Clipboard reading works correctly
- [ ] Provider connection is stable
- [ ] History saving/loading functions
- [ ] Error handling displays appropriate messages
- [ ] Keyboard shortcuts work as expected

## 🚀 Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Components and providers load on demand
2. **Caching**: Reuse provider instances where possible
3. **Error Recovery**: Graceful degradation when services are unavailable
4. **Memory Management**: Limit history size and clean up resources

### Monitoring

```typescript
// Performance tracking in enhancement
const startTime = Date.now();
const enhancedPrompt = await provider.enhance(clipboardText, preset);
const processingTime = Date.now() - startTime;

// Save timing data for analysis
await saveToHistory(clipboardText, enhancedPrompt, preset.id, {
  provider: provider.name,
  processingTime,
});
```

## 🔮 Future Architecture

### Planned Enhancements

1. **Plugin System**: Custom preset plugins
2. **Cloud Sync**: Cross-device history synchronization
3. **Analytics**: Usage metrics and optimization insights
4. **API Extensions**: Public API for third-party integrations

### Scalability Considerations

- **Provider Abstraction**: Easy addition of new AI services
- **Modular Presets**: User-defined preset types
- **Configuration Management**: Advanced settings and profiles
- **Performance Optimization**: Caching and background processing

---

**Next**: Explore [Development Best Practices](07-development.md) for contributing guidelines and code standards.
