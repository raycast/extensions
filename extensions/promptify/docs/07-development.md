# Development Guide

Contributing to Promptify: setup, coding standards, and best practices for developers.

## 🛠️ Development Environment

### Prerequisites

```bash
# Required software
Node.js 18+
npm 8+
Git 2.30+
Raycast 1.50+

# macOS development tools
Xcode Command Line Tools
```

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/Thomas-Basadonne/promptify-raycast.git
cd promptify-raycast

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Project Structure

```
promptify-raycast/
├── src/                    # Source code
│   ├── commands/          # Raycast command implementations
│   ├── core/             # Business logic and data models
│   ├── providers/        # AI service integrations
│   ├── ui/              # React components and hooks
│   └── utils/           # Utility functions
├── docs/                # Comprehensive documentation
├── assets/             # Icons and static resources
├── package.json        # Dependencies and Raycast configuration
├── tsconfig.json      # TypeScript configuration
└── eslint.config.js   # Code quality rules
```

## 📝 Coding Standards

### TypeScript Guidelines

#### Type Safety
```typescript
// ✅ Use strict typing
interface EnhancementRequest {
  input: string;
  preset: PresetConfig;
  provider: string;
}

// ❌ Avoid any types
function enhance(data: any): any { }

// ✅ Proper error typing
async function enhancePrompt(): Promise<string> {
  try {
    // implementation
  } catch (error) {
    if (error instanceof ProviderError) {
      // Handle specific error type
    }
    throw error;
  }
}
```

#### Interface Design
```typescript
// ✅ Clear, descriptive interfaces
export interface HistoryItem {
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

// ✅ Use readonly for immutable data
export interface PresetConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  systemPrompt: string;
  tags: readonly string[];
  readonly isBuiltIn: boolean;
}
```

### React Best Practices

#### Component Structure
```tsx
// ✅ Functional components with hooks
export function PromptPreview({ 
  input, 
  output, 
  isLoading, 
  error, 
  presetName,
  actions
}: PromptPreviewProps) {
  // Custom hooks for logic
  const { clipboardText, isLoading: clipboardLoading } = useClipboard();
  
  // Memoized computations
  const markdown = useMemo(() => {
    if (error) return `# ❌ Error\n\n${error}`;
    if (isLoading) return `# ⏳ Processing...`;
    return `# ✨ Enhanced Prompt\n\n${output}`;
  }, [input, output, isLoading, error]);

  return (
    <Detail 
      markdown={markdown} 
      isLoading={isLoading}
      actions={actions}
    />
  );
}
```

#### Custom Hooks
```tsx
// ✅ Encapsulate related logic
export function useProvider() {
  const [provider, setProvider] = useState<AIProvider | null>(null);
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  useEffect(() => {
    initializeProvider();
  }, []);

  const initializeProvider = async () => {
    // Implementation details
  };

  return { provider, isProviderReady, providerError, refreshProvider };
}
```

### Error Handling

#### Custom Error Classes
```typescript
// ✅ Specific error types
export class ProviderError extends AppError {
  constructor(message: string, public provider?: string) {
    super(message, 'PROVIDER_ERROR');
  }
}

// ✅ Error boundaries in components
try {
  const result = await provider.enhance(prompt, preset);
} catch (err) {
  if (err instanceof ProviderError) {
    setError(`${err.message}\n\nTips:\n- Check Ollama is running`);
  } else if (err instanceof NetworkError) {
    setError(`Network error: ${err.message}`);
  } else {
    setError('An unexpected error occurred');
  }
}
```

## 🧪 Testing

### Test Structure

```bash
src/
├── __tests__/          # Test files
│   ├── core/
│   ├── providers/
│   └── ui/
└── __mocks__/          # Mock implementations
```

### Unit Testing
```typescript
// Example test file: __tests__/core/presets.test.ts
import { PresetManager, BUILT_IN_PRESETS } from '../core/presets';

describe('PresetManager', () => {
  describe('validatePrompt', () => {
    test('should accept valid prompts', () => {
      const result = PresetManager.validatePrompt('Valid prompt text');
      expect(result.isValid).toBe(true);
    });

    test('should reject empty prompts', () => {
      const result = PresetManager.validatePrompt('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('clipboard');
    });

    test('should reject prompts that are too short', () => {
      const result = PresetManager.validatePrompt('Hi');
      expect(result.isValid).toBe(false);
    });
  });

  describe('getBuiltInPresets', () => {
    test('should return all built-in presets', () => {
      const presets = PresetManager.getBuiltInPresets();
      expect(presets).toHaveLength(3);
      expect(presets.map(p => p.id)).toContain('general');
      expect(presets.map(p => p.id)).toContain('images');
      expect(presets.map(p => p.id)).toContain('code');
    });
  });
});
```

### Integration Testing
```typescript
// Example: Testing provider integration
import { OllamaProvider } from '../providers/ollama';
import { BUILT_IN_PRESETS } from '../core/presets';

describe('OllamaProvider Integration', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider();
  });

  test('should enhance prompts successfully', async () => {
    // Mock fetch for testing
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: 'Enhanced prompt content' }
      })
    });

    const result = await provider.enhance(
      'Write about dogs', 
      BUILT_IN_PRESETS.general
    );

    expect(result).toBe('Enhanced prompt content');
  }, 10000);
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- presets.test.ts
```

## 🏗️ Architecture Patterns

### Provider Pattern Implementation

```typescript
// Base provider interface
export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  abstract enhance(prompt: string, preset: PresetConfig): Promise<string>;
  abstract isAvailable(): Promise<boolean>;
  
  protected formatPrompt(userPrompt: string, preset: PresetConfig): string {
    return `${preset.systemPrompt}\n\n${userPrompt}`;
  }
}

// Concrete implementation
export class OllamaProvider extends BaseProvider {
  name = 'Ollama';
  
  async enhance(prompt: string, preset: PresetConfig): Promise<string> {
    const formattedPrompt = this.formatPrompt(prompt, preset);
    // Ollama-specific implementation
  }
}

// Factory function
export async function getProvider(): Promise<AIProvider> {
  const preferences = getPreferenceValues<ProviderPreferences>();
  switch (preferences.provider) {
    case 'ollama':
      return new OllamaProvider();
    default:
      throw new Error(`Unknown provider: ${preferences.provider}`);
  }
}
```

### Storage Pattern

```typescript
// Centralized storage management
export class StorageManager {
  static async saveToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<string> {
    try {
      const id = generateId('hist');
      const historyItem: HistoryItem = { ...item, id, timestamp: Date.now() };
      
      const history = await this.getHistory();
      const updatedHistory = [historyItem, ...history].slice(0, 100);
      
      await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updatedHistory));
      return id;
    } catch (error) {
      throw new StorageError(`Failed to save to history: ${error}`);
    }
  }
}
```

## 📦 Build Process

### Development Build
```bash
# Watch mode with hot reload
npm run dev

# TypeScript compilation check
npm run build

# Lint and format
npm run lint
npm run fix-lint
```

### Production Build
```bash
# Build for Raycast Store submission
ray build

# Package for distribution
npm run package
```

### Build Configuration

#### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

#### ESLint Configuration
```javascript
// eslint.config.js
module.exports = {
  extends: ["@raycast/eslint-config"],
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-console": "warn"
  }
};
```

## 🔄 Git Workflow

### Branch Strategy
```bash
# Main branches
main          # Production releases
develop       # Integration branch

# Feature branches
feature/xyz   # New features
fix/xyz       # Bug fixes
docs/xyz      # Documentation updates
```

### Commit Convention
```bash
# Format: type(scope): description
feat(core): add custom preset support
fix(providers): handle network timeouts
docs(setup): update installation guide
refactor(ui): improve component structure
test(providers): add integration tests
```

### Pull Request Process
1. **Create Feature Branch**: `git checkout -b feature/custom-presets`
2. **Implement Changes**: Follow coding standards
3. **Add Tests**: Ensure good coverage
4. **Update Documentation**: Keep docs current
5. **Submit PR**: Use PR template
6. **Code Review**: Address feedback
7. **Merge**: Squash commits when merging

## 🚀 Release Process

### Version Management
```json
// package.json
{
  "version": "1.0.0",
  "scripts": {
    "version:patch": "npm version patch",
    "version:minor": "npm version minor", 
    "version:major": "npm version major"
  }
}
```

### Release Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version bumped appropriately
- [ ] CHANGELOG.md updated
- [ ] Build succeeds with `ray build`
- [ ] Manual testing completed
- [ ] PR approved and merged
- [ ] Tag created
- [ ] Release notes published

### Raycast Store Submission
```bash
# Build for submission
ray build

# Submit to Raycast Store
ray publish
```

## 🤝 Contributing Guidelines

### Getting Started
1. **Fork the Repository**: Create your own fork
2. **Clone Locally**: `git clone your-fork-url`
3. **Create Branch**: `git checkout -b feature/your-feature`
4. **Make Changes**: Follow coding standards
5. **Test Thoroughly**: Add tests for new features
6. **Submit PR**: Use the provided template

### Code Review Process
- **Automated Checks**: Linting, TypeScript, tests must pass
- **Manual Review**: Code quality, architecture, documentation
- **Testing**: Reviewer tests the functionality
- **Approval**: At least one maintainer approval required

### Issue Reporting
Use the issue templates:
- **Bug Report**: Include reproduction steps
- **Feature Request**: Describe the use case
- **Documentation**: Suggest improvements

## 📊 Performance Guidelines

### Optimization Targets
- **Startup Time**: <2 seconds to first interaction
- **Enhancement Time**: <10 seconds for typical prompts
- **Memory Usage**: <100MB during normal operation
- **Storage**: <1MB per 1000 history items

### Monitoring
```typescript
// Performance tracking
const startTime = performance.now();
await provider.enhance(prompt, preset);
const duration = performance.now() - startTime;

// Log slow operations
if (duration > 10000) {
  console.warn(`Slow enhancement: ${duration}ms`);
}
```

## 🔮 Future Development

### Roadmap Items
- **Custom Presets**: User-defined prompt templates
- **Cloud Sync**: Cross-device history synchronization
- **Team Features**: Shared prompt libraries
- **Analytics**: Usage insights and optimization
- **API Integration**: Third-party service connections

### Architecture Evolution
- **Plugin System**: Extensible preset and provider system
- **Microservices**: Separate enhancement engine
- **Real-time Collaboration**: Multi-user prompt editing
- **AI-Powered Features**: Smart categorization and suggestions

---

**Ready to contribute?** Check out our [GitHub Issues](https://github.com/Thomas-Basadonne/promptify-raycast/issues) for good first issues and feature requests!
