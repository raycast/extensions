# 发布 Obsidian (Memory Optimized) 扩展到 Raycast

## 当前状态

✅ 代码优化完成
✅ 构建成功
✅ Lint 检查通过
✅ Git 提交完成
✅ 登录到 Raycast 账户 (oldwinter)

## 发布选项

### 选项 1：发布到个人账户

当前扩展已经配置为发布到你的个人账户 `oldwinter`：

```json
"author": "oldwinter",
"name": "obsidian-memory-optimized"
```

### 选项 2：发布到组织

如果你有 Raycast 组织，可以修改 package.json 中的 author 字段：

```json
"author": "your-org-name"
```

## 手动发布步骤

1. **验证扩展**
   ```bash
   ray lint
   ray build
   ```

2. **提交最新更改**
   ```bash
   git add .
   git commit -m "Update extension name to avoid conflicts"
   ```

3. **发布扩展**
   ```bash
   ray publish
   ```

## 如果遇到发布问题

### 问题 1: Git 相关错误
- 确保所有更改都已提交
- 检查 git 仓库状态是否正常

### 问题 2: 扩展名冲突
- 当前已更改为 `obsidian-memory-optimized` 以避免冲突
- 如仍有冲突，可考虑其他名称如 `obsidian-large-vault`

### 问题 3: 权限问题
- 确保登录的账户有发布权限
- 检查是否需要加入特定组织

## 替代方案：本地安装

如果发布遇到困难，可以本地使用：

1. **构建扩展**
   ```bash
   ray build
   ```

2. **从 dist 目录安装**
   - 打开 Raycast
   - 进入设置 > 扩展
   - 点击 "Add Extension" 
   - 选择构建的 dist 文件夹

## 扩展特性总结

- **内存优化**: 支持 20,000+ 笔记的大型库
- **可配置限制**: 文件大小和数量限制
- **懒加载**: 大文件部分加载
- **智能截断**: 减少内存使用
- **进度跟踪**: 大库加载进度显示

## 后续维护

- 定期更新依赖
- 根据用户反馈优化性能
- 添加更多内存优化特性
