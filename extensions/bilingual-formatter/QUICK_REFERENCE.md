# 快速参考 - 关键问题与解决方案

## 当前阻塞问题

### 问题 #1: format-text.ts JSX 语法错误

**错误信息**:
```
[error] src/commands/format-text.ts: SyntaxError: '>' expected. (52:7)
```

**根本原因**:
- 使用了复杂的 React Form 组件
- Prettier 无法正确解析 JSX
- ESLint 检查失败

**解决方案（3 个选择）**:

#### 方案 A: 使用 Detail 组件（推荐）

```typescript
// src/commands/format-text.ts
import { Detail, Action, showToast, Toast, closeMainWindow, Clipboard } from '@raycast/api';
import { FormatterService } from '../services/formatter-service';
import { ErrorHandler } from '../services/error-handler';
import { Logger } from '../utils/logger';

export default function FormatText() {
  async function handleFormat() {
    try {
      Logger.log('FormatText: Starting');

      const text = "示例文本：在LeanCloud上，数据存储是围绕AVObject进行的。";

      const formatter = new FormatterService();
      const formatted = formatter.format(text);

      await Clipboard.copy(formatted);

      showToast({
        style: Toast.Style.Success,
        title: '格式化完成',
        message: '已复制到剪贴板',
      });

      await closeMainWindow();
      Logger.log('FormatText: Completed');
    } catch (error) {
      const errorMessage = ErrorHandler.handle(error as Error, 'FormatText');
      showToast({
        style: Toast.Style.Failure,
        title: '格式化失败',
        message: errorMessage,
      });
    }
  }

  return (
    <Detail
      markdown="### 格式化文本工具

点击下方按钮格式化示例文本。

#### 示例文本：
在LeanCloud上，数据存储是围绕AVObject进行的。"
      actions={
        <ActionPanel>
          <Action title="格式化并复制" onAction={handleFormat} />
        </ActionPanel>
      }
    />
  );
}
```

#### 方案 B: 简化为无视图命令

```typescript
// src/commands/format-text.ts
import { showToast, Toast, Clipboard } from '@raycast/api';
import { FormatterService } from '../services/formatter-service';
import { ErrorHandler } from '../services/error-handler';
import { Logger } from '../utils/logger';

export default async function FormatText() {
  try {
    Logger.log('FormatText: Starting');

    // 可以从参数读取，或者使用硬编码的示例
    const text = "示例文本：在LeanCloud上，数据存储是围绕AVObject进行的。";

    if (!text) {
      showToast({
        style: Toast.Style.Failure,
        title: '文本为空',
        message: '请提供要格式化的文本',
      });
      return;
    }

    const formatter = new FormatterService();
    const formatted = formatter.format(text);

    await Clipboard.copy(formatted);

    showToast({
      style: Toast.Style.Success,
      title: '格式化完成',
      message: '已复制到剪贴板',
    });

    Logger.log('FormatText: Completed');
  } catch (error) {
    const errorMessage = ErrorHandler.handle(error as Error, 'FormatText');
    showToast({
      style: Toast.Style.Failure,
      title: '格式化失败',
      message: errorMessage,
    });
  }
}
```

**注意**: 需要修改 package.json 中的配置，改为 `mode: "no-view"`

#### 方案 C: 使用 LaunchProps 接收参数

```typescript
// src/commands/format-text.ts
import { LaunchProps, showToast, Toast, Clipboard } from '@raycast/api';
import { FormatterService } from '../services/formatter-service';
import { ErrorHandler } from '../services/error-handler';
import { Logger } from '../utils/logger';

interface Arguments {
  text: string;
}

export default async function FormatText(props: LaunchProps<{ arguments: Arguments }>) {
  try {
    Logger.log('FormatText: Starting');

    const text = props.arguments.text || "示例文本：在LeanCloud上，数据存储是围绕AVObject进行的。";

    if (!text) {
      showToast({
        style: Toast.Style.Failure,
        title: '文本为空',
        message: '请提供要格式化的文本',
      });
      return;
    }

    const formatter = new FormatterService();
    const formatted = formatter.format(text);

    await Clipboard.copy(formatted);

    showToast({
      style: Toast.Style.Success,
      title: '格式化完成',
      message: '已复制到剪贴板',
    });

    Logger.log('FormatText: Completed');
  } catch (error) {
    const errorMessage = ErrorHandler.handle(error as Error, 'FormatText');
    showToast({
      style: Toast.Style.Failure,
      title: '格式化失败',
      message: errorMessage,
    });
  }
}
```

**推荐**: 方案 A 或 B
**理由**: 实现简单，用户体验好

---

## 立即执行的命令清单

### 步骤 1: 备份当前文件

```bash
cd /Users/wuhanjian/Projects/personal/github/raycast-bilingual-formatter
cp src/commands/format-text.ts src/commands/format-text.ts.backup
```

### 步骤 2: 选择方案并重写文件

使用方案 A:
```bash
cat > src/commands/format-text.ts << 'EOF'
// 方案 A 的代码（从上面复制）
EOF
```

或使用方案 B:
```bash
cat > src/commands/format-text.ts << 'EOF'
// 方案 B 的代码（从上面复制）
EOF
```

### 步骤 3: 运行 lint 检查

```bash
npm run lint
```

### 步骤 4: 如果有错误，查看详细信息

```bash
npm run lint 2>&1 | grep -A 10 "error src/"
```

### 步骤 5: 尝试自动修复

```bash
npm run fix
```

### 步骤 6: 开发模式测试

```bash
npm run dev
```

然后在 Raycast 中测试 Format Text 命令。

---

## 验证检查清单

- [ ] format-text.ts 重新实现完成
- [ ] `npm run lint` 没有错误
- [ ] `npm run dev` 可以启动
- [ ] Raycast 中可以看到所有 3 个命令
- [ ] Format Text 命令可以正常执行
- [ ] 格式化结果正确

---

## 其他已知问题

### 问题 #2: assets/icon.png 缺失

**解决方案**: 临时注释掉 package.json 中的 icon 配置

```bash
# 编辑 package.json
nano package.json

# 找到 icon 字段，暂时注释掉
# "icon": "assets/icon.png"
```

### 问题 #3: ESLint 配置可能有问题

**解决方案**: 重新安装依赖

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 快速测试命令

### 测试空格纠正器

```bash
# 在终端运行
node -e "
const { SpaceCorrector } = require('./src/correctors/space-corrector');
const corrector = new SpaceCorrector();
const input = '在LeanCloud上，数据存储';
const output = corrector.handle(input);
console.log('输入:', input);
console.log('输出:', output);
"
```

### 测试完整格式化服务

```bash
# 在终端运行
node -e "
const { FormatterService } = require('./src/services/formatter-service');
const service = new FormatterService();
const input = '在LeanCloud上，数据存储是围绕AVObject进行的。';
const output = service.format(input);
console.log('输入:', input);
console.log('输出:', output);
"
```

---

## 常用文件位置

```bash
# 项目根目录
cd /Users/wuhanjian/Projects/personal/github/raycast-bilingual-formatter

# 关键文件
src/commands/format-text.ts              # 需要修复的文件
src/services/formatter-service.ts         # 核心服务
src/correctors/space-corrector.ts        # 空格纠正器
src/utils/regex-patterns.ts              # 正则表达式
package.json                             # 项目配置
```

---

## 快速参考

### 核心类和方法

```typescript
// FormatterService
class FormatterService {
  format(text: string): string
}

// BaseCorrector
abstract class BaseCorrector {
  abstract handle(text: string): string
}

// 具体纠正器
class SpaceCorrector extends BaseCorrector
class CharacterCorrector extends BaseCorrector
class PunctuationCorrector extends BaseCorrector
class QuoteCorrector extends BaseCorrector
```

### Raycast API

```typescript
// Clipboard
Clipboard.copy(text: string): Promise<void>
Clipboard.paste(text: string): Promise<void>
Clipboard.readText(): Promise<string | undefined>

// Toast
showToast({ style: Toast.Style, title: string, message?: string }): void

// Action
Action title="按钮标题" onAction={() => void}
```

---

## 下一步建议

### 优先级 1（立即）
1. 修复 format-text.ts
2. 通过 lint 检查

### 优先级 2（今天）
3. 测试所有命令
4. 添加项目图标

### 优先级 3（本周）
5. 编写测试用例
6. 性能优化

### 优先级 4（下周）
7. 完善 README
8. 准备发布

---

**最后更新**: 2026-01-05
**文档版本**: 1.0
