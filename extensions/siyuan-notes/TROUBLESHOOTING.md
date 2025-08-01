# 故障排除指南

## 常见问题及解决方案

### 🚨 连接问题（最常见）

#### 错误现象
- 提示 "API request failed" 或连接被拒绝
- 搜索无结果或功能无响应
- 超时错误
- 控制台显示 `SiYuanAPI.searchNotes` 错误

### 🔧 开发依赖问题

#### 错误现象
- `useDebouncedCallback is not a function`
- 组件导入错误

#### 解决方案
这是由于错误使用 Raycast hooks 导致的问题：

**最佳实践**：
- 使用 `useCachedPromise` 进行异步数据获取
- 利用 `List` 组件的内置 `throttle` 属性
- 避免手动实现防抖逻辑

**推荐的搜索实现**：
```typescript
const { isLoading, data: results = [] } = useCachedPromise(
  async (query: string) => {
    if (!query.trim()) return [];
    const searchResult = await api.search(query);
    return searchResult.data;
  },
  [searchText],
  { keepPreviousData: true }
);

return (
  <List 
    isLoading={isLoading}
    onSearchTextChange={setSearchText}
    throttle
  >
    {/* 渲染结果 */}
  </List>
);
```

### 🔌 API 响应格式问题

#### 错误现象
- API 调用成功但数据格式不正确
- `response.code` 或 `response.data` 未定义错误
- "SiYuan API 返回错误" 但状态码是 200

#### 可能原因
1. API 端点路径错误（如使用了不存在的 `/search/fullTextSearch`）
2. 请求参数格式不正确
3. 思源笔记版本差异导致的API变更
4. 传递的ID参数为空（`id: undefined`）
5. SQL查询返回的数据结构与预期不符

#### 解决方案
确保 API 层正确处理思源笔记的响应格式：

```typescript
// 正确的 API 响应处理
private async request<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await this.client.post<SiYuanApiResponse<T>>(
    `/api${endpoint}`, 
    data
  );
  
  // 检查 API 响应状态
  if (response.data.code !== 0) {
    throw new Error(response.data.msg || "API 请求失败");
  }
  
  // 直接返回数据部分
  return response.data.data;
}
```

#### 解决步骤

1. **确认思源笔记正在运行**
   - 检查思源笔记是否已启动
   - 确认思源笔记界面可以正常使用
   - 默认端口：http://127.0.0.1:6806

2. **使用连接测试功能**
   - 在搜索界面按 `Cmd+T` 测试连接
   - 查看具体的错误信息

3. **验证API端点和方法**
   - 推荐使用：SQL查询 `/query/sql` （官方文档明确支持）
   - 可能有问题：`/search/searchBlock`（部分版本不稳定）
   - 错误的端点：`/search/fullTextSearch`（某些版本不支持）
   - 系统API端点：`/system/version`（用于测试连接）

4. **检查端口配置**
   - 思源笔记可能不在默认端口6806运行
   - 检查思源笔记界面显示的实际端口号
   - 更新插件设置中的 SiYuan Server URL
   - 示例：如果思源笔记运行在 `http://127.0.0.1:64840`，请更新设置

2. **检查 API 服务设置**
   - 在思源笔记中：设置 → 关于 → 确认 "API服务" 已勾选
   - 检查服务地址，默认应为 `http://127.0.0.1:6806`
   - 如果修改了端口，请在插件设置中更新地址

3. **验证网络连接**
   - 在浏览器中访问 `http://127.0.0.1:6806`
   - 应该看到思源笔记的 Web 界面

4. **检查 API Token**
   - 如果启用了鉴权：设置 → 关于 → 复制 "API token"
   - 将 token 粘贴到 Raycast 插件配置中
   - 如果没有显示 token，说明未启用鉴权，可以留空

### 🔍 搜索问题

#### 错误现象
- 搜索没有返回期待的结果
- 搜索速度很慢

#### 解决方案

1. **检查搜索关键词**
   - 确认关键词在笔记中确实存在
   - 尝试使用不同的关键词或更短的词语

2. **确认笔记内容**
   - 检查目标笔记是否有内容
   - 确认笔记没有被删除或移动

3. **重建索引**
   - 在思源笔记中：设置 → 搜索 → 重建索引

### ✏️ 创建笔记问题

#### 错误现象
- 无法创建新笔记
- 提示权限错误

#### 解决方案

1. **检查笔记本 ID**
   - 确认默认笔记本 ID 是否正确
   - 在思源笔记中右键笔记本 → 复制 ID

2. **验证路径格式**
   - 路径应以 `/` 开头，如 `/daily/2024-01-01`
   - 避免使用特殊字符

3. **检查写入权限**
   - 确认思源笔记有足够的磁盘空间
   - 检查目录权限

### 🔗 打开笔记失败

#### 错误现象
- 搜索到笔记但点击后无法打开
- 显示 "id: undefined" 错误
- 打开失败的Toast提示

#### 解决方案
1. **检查数据字段**：确保使用正确的 ID 字段（`id` 或 `rootID`）
2. **使用浏览器打开**：通过 `window.open()` 在浏览器中打开思源笔记
3. **检查URL格式**：确保思源笔记的URL格式正确：
   ```
   http://127.0.0.1:端口号/stage/build/desktop/?id=文档ID
   ```

### 📝 每日笔记问题

#### 错误现象
- 无法创建每日笔记
- 重复创建相同日期的笔记

#### 解决方案

1. **检查路径模板**
   - 默认路径：`/daily/{{date}}`
   - 确认模板中的占位符格式正确

2. **验证日期格式**
   - 插件使用 YYYY-MM-DD 格式
   - 检查系统日期设置是否正确

### 🕒 最近访问问题

#### 错误现象
- 最近访问列表为空
- 显示的文档不是最近访问的

#### 解决方案

1. **确认有访问记录**
   - 在思源笔记中打开一些文档
   - 等待几秒后再刷新插件

2. **检查数据库**
   - 重启思源笔记
   - 让数据库更新访问记录

## 高级故障排除

### 开启调试模式

1. **查看控制台日志**
   ```bash
   # 在项目目录运行
   npm run dev
   ```

2. **检查网络请求**
   - 在浏览器开发者工具中查看网络请求
   - 访问 `http://127.0.0.1:6806/api/system/version` 测试 API

### 重置插件配置

1. 删除 Raycast 中的插件配置
2. 重新配置思源笔记连接信息
3. 重启 Raycast

### 手动测试 API

使用 curl 测试 API 连接：

```bash
# 测试基本连接
curl http://127.0.0.1:6806/api/system/version

# 测试搜索 API
curl -X POST http://127.0.0.1:6806/api/search/searchBlock \
  -H "Content-Type: application/json" \
  -d '{"query":"测试","types":{"document":true},"method":0}'
```

## 联系支持

如果以上方法都无法解决问题：

1. 确认思源笔记版本（建议使用最新版本）
2. 确认 Raycast 版本
3. 收集错误日志和配置信息
4. 在项目 GitHub 仓库提交 Issue

## 附录：API 文档

- 思源笔记 API 文档：[https://github.com/siyuan-note/siyuan/blob/master/API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
- Raycast API 文档：[https://developers.raycast.com/](https://developers.raycast.com/)

## 参考项目

- [siyuan-mcp-server](https://github.com/onigeya/siyuan-mcp-server) - 思源笔记 MCP 服务器实现
  - 提供了完整的思源笔记 API 集成示例
  - 包含所有主要 API 端点的正确调用方式
  - 认证和错误处理的最佳实践

- [思源笔记社区 API 文档](https://github.com/siyuan-community/siyuan/blob/master/API.md)
  - 官方 API 文档，包含所有可用端点
  - SQL 查询接口 `/query/sql` 的详细说明
  - 标准 API 响应格式和错误处理