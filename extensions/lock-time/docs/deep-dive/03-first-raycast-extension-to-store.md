# 从零到 Store：一个新手的 Raycast Extension 开发与发布全记录

> 这是一篇不太一样的 deep-dive——不是 debug 实录，不是性能分析，而是一个从未写过 Raycast Extension 的开发者，从"我想做一个小工具"到"它上架了 Raycast Store"的完整旅程。记录这段经历，既是给自己的复盘，也希望能帮到下一个站在起点的人。

## 目录

- [缘起：一个简单的念头](#缘起一个简单的念头)
- [第一步：从 PRD 到 MVP](#第一步从-prd-到-mvp)
- [踩坑实录（概要）](#踩坑实录概要)
- [准备上架：Store 合规之路](#准备上架store-合规之路)
- [提交 PR：没想到这么简单](#提交-pr没想到这么简单)
- [社区的力量](#社区的力量)
- [Raycast is a Lifestyle](#raycast-is-a-lifestyle)
- [给后来者的一份清单](#给后来者的一份清单)
- [回头看](#回头看)

---

## 缘起：一个简单的念头

每天用 Mac 工作，锁屏解锁无数次。但我从来不知道自己一天到底锁屏了多久，每次连续工作了多长时间。

这些信息其实非常有价值——锁屏意味着中断，解锁到下一次锁屏意味着一段连续的专注。如果能把它量化出来，也许能帮助自己理解真实的工作节奏。

Raycast 是我每天必用的效率工具。它的扩展生态让我意识到：**如果市面上没有我想要的工具，也许我可以自己做一个。**

于是 Lock Time 诞生了——一个追踪 Mac 锁屏时间的 Raycast Extension。

---

## 第一步：从 PRD 到 MVP

### 先想清楚再动手

作为一个非 Raycast Extension 开发背景的人，我做的第一件事不是写代码，而是写 PRD。

核心问题只有三个：
1. **追踪什么？** — 今日累计锁屏时长、上次锁屏持续时长、上次连续工作时长
2. **怎么检测？** — 轮询 + 系统 API 查询锁屏状态
3. **数据存哪？** — Raycast LocalStorage，Local-first，不碰网络

PRD 写完之后，产品的边界就清晰了：不做复杂分析、不做跨设备同步、不做行为建议。**只做可信的时间事实。**

### Raycast 开发体验：出乎意料的顺滑

Raycast 的开发者体验是我用过的扩展平台中最好的。

```bash
# 创建项目
npx create-raycast-extension

# 开发模式，在 Raycast 中实时预览
npm run dev
```

就这么简单。`npm run dev` 之后，Raycast 里就能看到你的扩展了。改一行代码，保存，Raycast 里自动刷新。这种反馈速度让开发变得很愉快。

Raycast 提供的 API 设计也很克制：`List`、`Detail`、`Action`、`MenuBarExtra`……组件不多，但组合起来足够表达大多数场景。文档清晰，示例代码可以直接跑。

从零到第一个能用的 MVP，我只花了不到一天时间。

---

## 踩坑实录（概要）

当然，"能用"和"好用"之间，隔着两个大坑。

### 坑一：macOS 26 上锁屏检测完全失效

v0.0.1 发布后，发现在 macOS 26 (Tahoe) 上所有时间指标永远为零。排查发现 JXA 的 ObjC bridge 在 macOS 26 上无法正确桥接 CFDictionary，最终改用 Swift 原生调用 `CGSessionCopyCurrentDictionary()` 才解决。

**完整排查过程**：[Debug 实录：macOS 26 上锁屏检测全面失效的排查与修复](01-debug-lock-detection-macos26.md)

### 坑二：首屏加载需要 3 秒

检测修好了，但每次打开 Lock Stats 都要等 3 秒。瓶颈在 Swift 解释器的启动开销（~1.5s）。通过"先展示缓存、后台异步更新"的 stale-while-revalidate 策略，将首屏加载降至 0.3 秒。

**完整优化过程**：[从 3 秒到 0.5 秒：首屏加载性能优化实战](02-lock-stats-loading-performance.md)

---

## 准备上架：Store 合规之路

功能开发完、性能优化好，以为可以直接发布了？没那么快。

Raycast Store 有一套[详细的审核规范](https://developers.raycast.com/basics/prepare-an-extension-for-store)，每一条都需要认真对照检查。以下是我实际遇到的问题和调整。

### 1. ESLint 配置不兼容

`@raycast/eslint-config` 从 v1.x 升级到 v2.x 后，导出格式变为 flat config 数组。但 v2.x 内部包含嵌套数组，ESLint 8.x 不支持：

```
TypeError: Unexpected array.
```

解决方案：手动 flatten。

```javascript
const raycastConfig = require("@raycast/eslint-config");
module.exports = raycastConfig.flat(Infinity);
```

一个小坑，但如果不跑 `npm run lint` 验证，你根本不知道它存在。

### 2. CHANGELOG 格式

Raycast Store 要求 CHANGELOG 使用特定格式：

```markdown
## [标题用方括号包裹] - {PR_MERGE_DATE}
```

`{PR_MERGE_DATE}` 是一个占位符，PR 合并时会被自动替换为实际日期。我之前用的是 `[0.0.3] - 2026-02-08` 这种版本号格式，需要改成描述性标题。

### 3. README 必须全英文

Raycast Store 目前只支持 US English。我原来的 README 是中英混排的，需要重写为纯英文版本。中文文档可以保留在 `docs/` 目录，但 README 作为 Store 用户看到的第一个页面，必须英文。

### 4. 命令命名要符合 Apple Style Guide

所有命令标题必须遵循 Title Case：

| 原来 | 调整后 | 合规 |
|------|--------|------|
| Lock Stats | Lock Stats | ✅ 无需改动 |
| Update Lock State | Update Lock State | ✅ 无需改动 |
| Lock Time Menu Bar | Lock Time Menu Bar | ✅ 无需改动 |

幸运的是，我的命名一开始就遵循了这个规范。

### 5. 截图（至少 3 张）

Store 页面会展示截图，建议至少 3 张。Raycast 内置了截图工具（偏好设置 → Advanced → Window Capture），截图自动保存到 `metadata/` 目录，格式是 2000x1250 像素的 PNG。

顺便说一句，Raycast extension 的开发体验真的太好了，连截图工具都原生集成，轻松满足了 Store 的截图需求，每个开发者生产出来的截图规格都能保持一致。这种将用户体验做到极致的设计，实在令人佩服，必须点一个大大的赞！

### 6. 图标不能用默认的

必须使用自定义 512x512 PNG 图标。Raycast 提供了 [icon.ray.so](https://icon.ray.so/) 这个在线工具，可以快速生成符合规范的图标。

### 合规检查清单

最终我整理出了一张完整的自查表：

| 检查项 | 状态 |
|--------|------|
| `author` 使用 Raycast 账户用户名 | ✅ |
| `license` 为 MIT | ✅ |
| 使用最新 Raycast API 版本 | ✅ |
| `package-lock.json` 已包含 | ✅ |
| 命令标题符合 Title Case | ✅ |
| 扩展描述是简洁的一句话 | ✅ |
| 图标 512x512 PNG，非默认图标 | ✅ |
| `npm run build` 通过 | ✅ |
| `npm run lint` 通过 | ✅ |
| CHANGELOG 格式正确 | ✅ |
| README 提供英文使用说明 | ✅ |
| 截图已放入 `metadata/` 目录 | ✅ |

**建议：在最终提交前，务必在本地跑一遍 `npm run build && npm run lint`，确保零报错。** 这是 CI 会做的事情，本地先过一遍能省很多等待时间。

---

## 提交 PR：没想到这么简单

准备好一切后，下一步就是提交到 [raycast/extensions](https://github.com/raycast/extensions) 仓库。

说实话，我最初看到这个 monorepo 时有点懵——它有几千个扩展，目录结构庞大。我原以为需要完整 clone 整个仓库、在本地配置好开发环境，才能提交自己的扩展。

但 [@alexi_build](https://x.com/alexi_build) 告诉我可以用更轻量的方式。Raycast 官方的 [Review an Extension in a Pull Request](https://developers.raycast.com/basics/review-pullrequest) 文档中提到了 sparse checkout 的方式，这意味着你不需要下载整个仓库。

> 💡 What is `git sparse-checkout`？
> 
> `"Sparse checkout allows populating the working directory sparsely. It helps you avoid checking out all files in the repository, instead letting you specify only the parts you need."`
> 
> —— 摘自 [Git 官方文档](https://git-scm.com/docs/git-sparse-checkout)
> 
> 简单来说，你只需要下载和你的扩展相关的目录和文件，无需把整个几千个扩展的仓库都拉下来，大大提升了 clone 和操作的效率。

实际操作步骤：

### Step 1: Fork 仓库

在 GitHub 上 Fork [raycast/extensions](https://github.com/raycast/extensions) 到自己的账户。

### Step 2: Clone（只下载必要部分）

```bash
# Clone 你的 fork（shallow clone，只要最近的 commit）
git clone --depth=1 https://github.com/YOUR_USERNAME/extensions.git
cd extensions
```

### Step 3: 创建分支并添加扩展

```bash
git checkout -b add-lock-time

# 把你的扩展目录复制进去
cp -r /path/to/your/lock-time extensions/lock-time
```

注意只复制必要的文件，不要包含开发过程中的临时文件（如 `.cursor/`、`docs/PRD/`、`node_modules/`、`dist/` 等）。

### Step 4: 提交并创建 PR

```bash
cd extensions/lock-time
npm install && npm run build  # 确保在 monorepo 环境下也能构建通过

cd ../..
git add extensions/lock-time/
git commit -m "Add Lock Time extension"
git push origin add-lock-time
```

然后在 GitHub 上创建 Pull Request，使用 Raycast 提供的 PR 模板填写描述。

**整个过程不到 10 分钟。** PR 提交后，Raycast 的 CI 会自动跑 build 和 lint 检查。如果通过了，就等待团队审核。

---

## 社区的力量

回顾整个开发过程，社区在每一个关键节点都给了我帮助。

### 文档即社区

Raycast 的官方文档写得非常扎实。从 [Create Your First Extension](https://developers.raycast.com/basics/create-your-first-extension) 到 [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)，每一步都有清晰的说明和示例。这不是那种"写了等于没写"的文档，而是真正能让你跟着走完全程的指南。

### 人即社区

[@alexi_build](https://x.com/alexi_build) 在我准备提交时告诉我不需要完整 clone 整个 extensions 仓库——这一个信息就帮我省了不少弯路。社区里这样的小 tips 看似微不足道，但对新手来说，它们就是"继续走下去"和"卡住放弃"之间的分水岭。

### 生态即社区

Raycast Store 里有几千个扩展，每一个都是社区成员贡献的。当你开发自己的扩展时，可以参考已有扩展的代码结构、命名规范、PR 描述格式。这种"以已有作品为范例"的学习方式，比任何文档都高效。

**产品拥有了社区的力量，将会快速增长。** 这不是一句口号。当成千上万的开发者为一个平台贡献扩展时，每一个用户的需求都可能被某个素未谋面的人解决。这种规模效应是封闭产品无法企及的。

**社区不是产品的附属品，它是产品价值力得到体现的根本表现。** 没有社区的生产力工具，只是一个软件；有了社区的生产力工具，是一个生态。

---

## Raycast is a Lifestyle

2026 年 1 月 11 日，[Thomas Paul Mann](https://x.com/thomaspaulmann) 在 [Raycast Meetup Shenzhen](https://www.youtube.com/watch?v=_h0OIU3JJ7w) 上被问了一个问题：

> "如果要用一个词来形容 Raycast，你会选什么？"

他的回答是：

> **"Raycast is a lifestyle."**

我当时听到这句话，就被击中了。

一个生产力工具凭什么说自己是 lifestyle？因为它真的渗透进了你的每一个工作瞬间。你想搜文件、查颜色、算汇率、管 Todo、查 API 文档、甚至追踪锁屏时间——你不需要打开浏览器，不需要切换 App，不需要离开你的键盘流。

**随心所欲，随自己所想，随时可以 build。**

这才是 Raycast 最了不起的地方。它不是一个功能固定的工具，而是一个平台——一个让你把脑海中的效率想法变成现实的平台。只要你愿意想，你就能 build。只要你 build 了，它就能融入你的日常。

Lock Time 对我来说就是这样。它解决的问题极其细小——追踪锁屏时间。但正是因为 Raycast 的扩展机制足够开放、开发体验足够流畅、社区生态足够繁荣，这样一个"micro idea"才得以在一天内从念头变成产品、一周内从本地工具变成 Store 上的公开扩展。

**当一个工具能让你无限期地满足自己的效率需求时，它确实不只是工具了，它是一种生活方式。**

---

## 给后来者的一份清单

如果你也想开发并发布你的第一个 Raycast Extension，以下是我整理的一份实操清单：

> 以下这一切，你都可以借助 AI 指导你一步一步的完成。

### 开发阶段

1. **从 `npx create-raycast-extension` 开始**，不要从零搭项目
2. **先写 PRD**，想清楚做什么、不做什么，比写代码更重要
3. **善用 `npm run dev`**，实时预览让迭代飞快
4. **遇到系统级问题优先查 Raycast 社区和 GitHub Issues**，很可能别人已经遇到过 （AI）
5. **用 `fs.appendFileSync` 写日志**，不要用 `console.log` 或 `fetch` 在 no-view 命令中 debug

### 上架准备

6. **逐条对照 [Store Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)**，不要跳过任何一条
7. **`npm run build && npm run lint` 必须零错误**
8. **CHANGELOG 使用 `{PR_MERGE_DATE}` 格式**
9. **README 全英文，简洁明了**
10. **截图至少 3 张**，用 Raycast 内置的 Window Capture 工具

### 提交 PR

11. **Fork [raycast/extensions](https://github.com/raycast/extensions)**
12. **不需要 clone 整个仓库**，shallow clone + sparse checkout 即可
13. **只提交必要文件**，排除 `.cursor/`、`docs/`（非 README）、`node_modules/` 等
14. **PR 描述使用模板**，认真填写 Description 和 Checklist
15. **耐心等待审核**，有修改意见就积极响应

---

## 回头看

从一个周末的念头，到 Raycast Store 上的公开扩展——

- **Day 1**：写 PRD，搭建项目，实现 MVP
- **Day 1**：发现 macOS 26 检测失效，完成 4 种方案的排查与修复
- **Day 2**：性能优化，首屏加载从 3s 降至 0.5s
- **Day 2**：整理代码规范、CHANGELOG、README，截图，提交 PR

一个周末足矣。从零到 Store Ready。

这不是因为我有多厉害，而是因为 Raycast 把开发者体验做到了极致：脚手架好用、API 设计克制、文档详尽、社区活跃、审核流程透明。还有一个最大的帮手：AI —— Cursor + Opus 4.6 的 Plan mode、Debug mode、Agent mode 都给了我极大的辅助。在开发过程中，我还构建了 Cursor Rules 和 Cursor Skills，显著提升了效率和规范性。

**最好的开发者平台，是让人忘记"平台"这件事，只专注于自己想解决的问题。**

Lock Time 是我的第一个 Raycast Extension，但绝不会是最后一个。因为，当你发现自己可以用几十行代码（一句话）就能把一个想法变成每天都在用的工具时——那种满足感是会上瘾的。

---

*本文是 Lock Time Deep Dive 系列的第三篇。*
*前两篇：*
- *[01 — Debug 实录：macOS 26 上锁屏检测排查与修复](01-debug-lock-detection-macos26.md)*
- *[02 — 从 3 秒到 0.5 秒：首屏加载性能优化实战](02-lock-stats-loading-performance.md)*
