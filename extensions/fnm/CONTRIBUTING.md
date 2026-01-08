# 贡献指南

感谢您对 FNM Raycast 扩展的关注!

## 开发环境设置

1. **克隆仓库**
   ```bash
   git clone <your-repo-url>
   cd fnm-raycast
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发模式**
   ```bash
   npm run dev
   ```
   
   这将在 Raycast 中加载扩展的开发版本。

## 项目结构

```
fnm-raycast/
├── src/
│   ├── utils/
│   │   └── fnm.ts           # fnm 命令行工具封装
│   ├── list-versions.tsx     # 列出已安装版本
│   ├── install-version.tsx   # 安装新版本
│   ├── use-version.tsx       # 切换版本
│   └── uninstall-version.tsx # 卸载版本
├── assets/
│   └── icon.png             # 扩展图标
├── package.json             # 项目配置和依赖
├── tsconfig.json            # TypeScript 配置
└── README.md                # 项目文档
```

## 开发指南

### 代码风格

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 运行 `npm run lint` 检查代码质量
- 运行 `npm run fix-lint` 自动修复问题

### 提交规范

使用语义化的提交信息:

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

示例:
```
feat: 添加版本搜索功能
fix: 修复卸载当前版本的问题
docs: 更新安装说明
```

## 测试

在提交之前,请确保:

1. 所有命令都能正常工作
2. 没有 TypeScript 错误
3. 通过 ESLint 检查
4. 在 Raycast 中实际测试过功能

## 提交 Pull Request

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 问题反馈

如果您发现 bug 或有功能建议,请:

1. 检查是否已有相关 issue
2. 如果没有,创建新的 issue
3. 提供详细的描述和复现步骤

## 许可证

通过贡献代码,您同意您的贡献将在 MIT 许可证下发布。
