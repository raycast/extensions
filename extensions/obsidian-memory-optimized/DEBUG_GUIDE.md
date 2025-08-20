# Obsidian Raycast 扩展调试指南

## 内存溢出问题修复

此扩展已经针对大型 Obsidian 笔记库进行了优化，支持处理超过 20,000 个笔记文件。

### 修复内容

1. **智能文件加载策略**
   - 限制最多加载 5000 个笔记文件（可满足大部分搜索需求）
   - 大文件（>50KB）只加载部分内容用于预览
   - 文件内容超过 10000 字符会自动截断

2. **文件大小过滤功能**
   - 新增了 `maxFileSizeMB` 设置项，默认值为 2MB
   - 超过此大小的文件将不会被索引，避免内存溢出
   - 可在 Raycast 扩展设置中调整此值

3. **懒加载模式**
   - 新增 `lazyLoadContent` 选项（默认开启）
   - 大文件只加载必要的元数据，不加载完整内容
   - 大幅减少内存使用

4. **增强的内存管理**
   - 添加了错误处理，避免单个文件加载失败影响整体
   - 在控制台显示加载进度和跳过的文件信息

## 本地开发调试

### 方法 1：使用 Shell 脚本（推荐）

```bash
# 给脚本添加执行权限（首次使用）
chmod +x dev.sh

# 启动开发环境（4GB 内存限制）
./dev.sh

# 或指定 Obsidian vault 路径
./dev.sh /Users/oldwinter/oldwinter-notes
```

### 方法 2：使用 npm 脚本

```bash
# 安装依赖
npm install

# 普通开发模式
npm run dev

# 大内存模式（4GB）- 适用于 10,000-20,000 个笔记
npm run dev:large

# 超大内存模式（8GB）- 适用于 20,000+ 个笔记
npm run dev:xlarge
```

### 方法 3：手动设置环境变量

```bash
# macOS/Linux
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev

# Windows PowerShell
$env:NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

## 配置说明

### Raycast 扩展设置

在 Raycast 中打开 Obsidian 扩展设置，可以配置：

1. **Vault Path**: 你的 Obsidian 笔记库路径
   - 例如：`/Users/oldwinter/oldwinter-notes`

2. **Excluded Folders**: 要排除的文件夹（逗号分隔）
   - 例如：`Templates, Archive, .trash`

3. **Max File Size (MB)**: 最大文件大小限制（新增）
   - 默认值：10MB
   - 设置为 0 或留空以禁用限制
   - 建议值：
     - 普通使用：5-10MB
     - 大型笔记库：2-5MB
     - 极大型笔记库：1-2MB

## 性能优化建议

1. **排除不必要的文件夹**
   - 将模板、归档、附件等文件夹添加到排除列表

2. **限制文件大小**
   - 如果有特别大的笔记文件，考虑拆分或设置合适的大小限制

3. **定期清理缓存**
   - 扩展使用缓存提高性能，如遇问题可尝试重新加载

4. **监控内存使用**
   ```bash
   # 查看 Node.js 进程内存使用
   ps aux | grep node
   ```

## 故障排除

### 问题：仍然出现内存溢出

1. 增加内存限制：
   ```bash
   export NODE_OPTIONS="--max-old-space-size=8192"  # 8GB
   ```

2. 减小文件大小限制：
   - 在设置中将 `Max File Size (MB)` 调整为更小的值（如 2MB）

3. 排除更多文件夹：
   - 添加附件文件夹、日志文件夹等到排除列表

### 问题：某些笔记无法搜索到

检查以下情况：
- 文件是否超过大小限制
- 文件夹是否被排除
- 文件编码是否为 UTF-8

### 查看调试日志

开发模式下，控制台会显示：
- 加载的笔记数量
- 跳过的文件及原因
- 加载耗时统计

## 联系支持

如果问题仍未解决，请提供以下信息：
- Obsidian 笔记库大小（文件数量）
- 最大的单个文件大小
- 系统内存大小
- 错误日志截图
