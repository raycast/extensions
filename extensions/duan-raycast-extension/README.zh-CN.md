# duan (Raycast 扩展)

基于 Cloudflare Workers 和 D1 数据库的 URL 短链接服务

<p align="center">
  <img src="https://img.shields.io/badge/cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/D1%20Database-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare D1">
  <img src="https://img.shields.io/badge/Raycast-Extension-blue.svg?style=for-the-badge&logo=raycast&logoColor=white" alt="Raycast Extension">
</p>

## 功能特性

- 创建和管理短链接
- 启用/禁用链接
- 添加链接描述
- 高级搜索功能
  - 多字段搜索（短码、URL、描述）
  - 支持部分匹配
  - 大小写不敏感
  - 支持中文搜索

## 如何使用？

1. 在 Cloudflare Workers 上[部署你自己的 duan API 服务](https://github.com/insv23/duan/tree/main?tab=readme-ov-file#installation)。

2. 从 Raycast 扩展商店安装此扩展。

   或手动安装：
   ```bash
   git clone https://github.com/insv23/duan-raycast-extension.git && cd duan-raycast-extension
   npm install && npm run dev
   ```

3. 使用你的 API 主机和令牌配置扩展。

4. 开始使用扩展来缩短和管理你的链接。

## 开发

### 项目结构

```
.
├── README.md
├── README.zh-CN.md
├── package.json
├── src/
│   ├── components/
│   │   ├── LinkDetail.tsx    # 链接编辑表单
│   │   └── LinkItem.tsx      # 列表项组件
│   ├── hooks/
│   │   └── useLinks.ts       # 数据获取 hook
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts     # API 客户端实现
│   │   │   ├── config.ts     # API 配置
│   │   │   ├── endpoints/
│   │   │   │   ├── links.ts  # 链接 API 端点
│   │   │   │   └── slugs.ts  # 短码 API 端点
│   │   │   └── index.ts      # API 导出
│   │   ├── search.ts         # 搜索工具
│   │   └── validation/
│   │       ├── slug/
│   │       │   ├── cache.ts  # 短码缓存管理
│   │       │   ├── index.ts  # 短码验证逻辑
│   │       │   └── types.ts  # 短码验证类型
│   │       ├── url/
│   │       │   ├── index.ts  # URL 验证逻辑
│   │       │   └── types.ts  # URL 验证类型
│   │       └── index.ts      # 验证导出
│   ├── types/
│   │   └── index.ts          # TypeScript 类型定义
│   ├── utils/
│   │   └── random.ts         # 随机短码生成
│   ├── list-links.tsx        # 列表链接命令
│   └── shorten-link.tsx      # 创建链接命令
```

### 搜索功能

扩展提供了强大的搜索功能，用户可以通过以下字段查找链接：
- 短码
- 原始 URL
- 描述

搜索实现支持：
- 部分匹配（例如，搜索 "git" 会匹配 "github.com"）
- 大小写不敏感
- 中文搜索
- 多字段搜索（匹配任意字段）

示例：
```typescript
// 跨所有字段搜索
const results = searchLinks(links, "github");

// 将匹配：
// - 短码: "gh-repo"
// - URL: "https://github.com/..."
// - 描述: "我的 GitHub 仓库"
```

### 缓存机制

Raycast 提供了三种不同的缓存机制，每种都适用于特定场景：

#### Cache (底层 API)
- **特点：**
  - 基础的键值存储
  - 同步操作
  - 完全可控的缓存管理
  - 可在非 React 环境使用
- **最适合：**
  - 在非 React 代码中使用缓存
  - 需要精确控制缓存的读写操作
  - 实现自定义缓存策略
  - 表单验证缓存

#### useCachedState (React Hook)
- **特点：**
  - 类似 useState 但会持久化
  - 适合存储 UI 状态
  - 可在组件间共享
- **最适合：**
  - 在应用重启后保持 UI 状态
  - 在多个组件间共享持久化状态
  - 存储用户偏好设置
  - UI 配置持久化

#### useCachedPromise (React Hook)
- **特点：**
  - 实现了 stale-while-revalidate 策略
  - 自动处理加载状态
  - 内置错误处理
  - 针对异步数据获取优化
- **最适合：**
  - 缓存 API 调用结果
  - 实现数据后台刷新
  - 优化数据加载体验
  - 列表数据缓存

#### 实现案例

以下是两个具体的使用案例，展示如何选择合适的缓存机制：

##### 链接列表缓存
- **使用场景：** 缓存所有短链接列表
- **选用方案：** `useCachedPromise`
- **原因：**
  - 涉及异步 API 调用获取数据
  - 需要自动后台刷新
  - 需要处理加载状态
  - 受益于 stale-while-revalidate 策略
  - 在显示缓存内容的同时保持数据新鲜度

##### Slug 可用性验证
- **使用场景：** 缓存 slug 可用性检查结果
- **选用方案：** `Cache` (底层 API)
- **实现细节：**
  1. 在 "Shorten Link" 命令加载时：
     - 通过 API 获取所有已使用的 slugs
     - 同步存储到 Cache 中
     - 使用 requestIdleCallback 避免阻塞 UI
     - 包含超时和清理机制
  2. 在表单验证时：
     - 同步读取 Cache
     - 执行格式验证
     - 检查是否与已缓存的 slugs 重复
  3. 优势：
     - 即时的验证反馈
     - 表单验证过程中无异步操作
     - 高效的资源利用
     - 不阻塞命令启动
