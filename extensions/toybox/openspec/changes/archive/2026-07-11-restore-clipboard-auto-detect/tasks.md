## 1. 命令入口改造

- [ ] 1.1 在 `src/json.tsx` 的 `Command` 中重新引入 `useEffect`、`useState` 跟踪 loading/ready/error 三态
- [ ] 1.2 挂载时调用 `Clipboard.readText()`：成功且能解析为 JSON → `navigation.push(<JsonNodePage>)`；否则回退到 Form
- [ ] 1.3 读取期间渲染 `<Detail isLoading markdown="正在读取剪贴板…" />`
- [ ] 1.4 读取抛错时显示 `Toast.Failure` 后回退到 Form
- [ ] 1.5 Form 的 TextArea 默认值：剪贴板非空时填充为原始文本，否则空字符串

## 2. 元数据与收尾

- [ ] 2.1 在 `CHANGELOG.md` `[Unreleased]` 段添加变更条目
- [ ] 2.2 跑 `npx tsc --noEmit`、`npx eslint src/`、`npx prettier --check src/`
- [ ] 2.3 跑 `openspec validate restore-clipboard-auto-detect`

## 3. 归档

- [ ] 3.1 运行 `openspec archive restore-clipboard-auto-detect --yes` 合并 delta spec
