# Debug 实录：macOS 26 上锁屏检测全面失效的排查与修复

> Lock Time 是一个 Raycast 扩展，用于追踪 Mac 的锁屏时间和连续工作时间。在 macOS 26 (Tahoe) 上，我们遇到了锁屏检测完全失效的问题——所有时间指标永远为零。本文记录了完整的排查过程：从 AppleScript 的误报陷阱，到 JXA ObjC bridge 的隐性 Bug，再到 Swift 原生桥接的最终解决方案。

## 目录

- [问题现象](#问题现象)
- [运行环境](#运行环境)
- [方案 A：AppleScript 前台进程检测](#方案-a-applescript-前台进程检测)
- [方案 B：JXA + CGSessionCopyCurrentDictionary](#方案-b-jxa--cgsessioncopyurrentdictionary)
- [方案 C：间隙检测 / Gap Detection](#方案-c-间隙检测--gap-detection)
- [方案 D：Swift + CGSessionCopyCurrentDictionary（最终方案）](#方案-d-swift--cgsessioncopyurrentdictionary最终方案)
- [方案对比总结](#方案对比总结)
- [排查中的关键洞察](#排查中的关键洞察)
- [给后来者的建议](#给后来者的建议)
- [最终架构](#最终架构)

---

## 问题现象

Lock Time v0.0.1 发布后，在 macOS 26 上测试发现：

- **Today Locked Time 永远为 0**
- **Last Lock Duration 永远为 0**
- 手动锁屏、等待、解锁后，数据仍无变化
- 后台命令（`update-lock-state`）每 60 秒按时执行，但从未检测到锁屏状态

**直觉判断**：锁屏检测方法在 macOS 26 上失效了。但具体失效在哪里？哪一层出了问题？需要系统性地排查。

## 运行环境

| 项目 | 值 |
|---|---|
| 硬件 | MacBook Air M3 (Mac15,12) |
| 系统 | macOS 26.2 (Tahoe), Build 25C56 |
| 运行时 | Raycast Extension (Node.js) |
| 轮询间隔 | 60 秒 (`interval: "1m"`) |

---

## 方案 A：AppleScript 前台进程检测

### 原理

v0.0.1 最初使用 AppleScript 检测锁屏，思路很直觉：

```applescript
tell application "System Events" to get name of first application process whose frontmost is true
```

获取当前前台进程名称，如果是 `loginwindow` 或 `ScreenSaverEngine` 则判定为锁屏。

### 失败原因

这个方案有三个致命问题：

**1. 间接推断，非直接检测**

通过前台进程名"猜测"锁屏状态，本质是一种间接推理。如果 macOS 在锁屏时的前台进程名有变化（不同版本、不同场景），推理就会失败。

**2. 需要 Automation 权限**

AppleScript 需要在"系统设置 > 隐私与安全 > 自动化"中授权 Raycast 控制 System Events。如果用户未授权，脚本执行直接报错。

**3. 错误处理的致命缺陷**

这是最核心的问题。原始代码中，`catch` 块默认返回 `"unlocked"`：

```typescript
try {
  const result = execSync(`osascript -e '...'`).trim();
  return LOCKED_PROCESSES.includes(result) ? "locked" : "unlocked";
} catch {
  return "unlocked"; // ← 致命：锁屏时 AppleScript 执行失败，被误报为"未锁屏"
}
```

锁屏期间 AppleScript 很可能执行失败（无法访问 System Events），但失败后返回 `"unlocked"`，等于**锁屏时反而报告"未锁屏"**——这让锁屏检测彻底失去意义。

### 教训

> **检测方法的错误回退值决定了整个系统的下限。** 如果失败时默认返回 `"unlocked"`，所有异常情况都会被静默忽略。正确的做法是：检测失败时保持上一次状态不变。

---

## 方案 B：JXA + CGSessionCopyCurrentDictionary

### 原理

既然 AppleScript 不可靠，那直接调用系统 API 呢？macOS 提供了 `CGSessionCopyCurrentDictionary()` 这个 CoreGraphics API，可以直接查询当前会话的 `CGSSessionScreenIsLocked` 字段。

选择 JXA（JavaScript for Automation）是因为它可以直接在 `osascript` 中调用 ObjC API，不需要编译步骤：

```javascript
ObjC.import('CoreGraphics');
ObjC.import('Foundation');
var cfDict = $.CGSessionCopyCurrentDictionary();
var nsDict = $.NSDictionary.alloc.initWithDictionary(cfDict);
var locked = nsDict.objectForKey('CGSSessionScreenIsLocked');
```

代码看起来完全正确——API 对了，键名对了，类型转换也对了。

### 失败原因

**运行时日志揭示了一个完全意料之外的问题。**

在 macOS 26 上，JXA 的 ObjC bridge 对 `CFDictionary` 的桥接出现了严重的兼容性问题。`NSDictionary.alloc.initWithDictionary(cfDict)` 返回的不是字典内容，而是一个只包含类型描述符的对象：

```json
{"type": "{__CFDictionary=}"}
```

字典的所有实际键值对（包括 `CGSSessionScreenIsLocked`）**全部丢失**。

这不是 API 用法错误，而是 macOS 26 中 JXA 运行时的一个行为变化（或 Bug）。在 macOS 15 及更早版本上，同样的代码可能正常工作。

### 为什么代码审查无法发现

这个问题具有高度隐蔽性：

1. **语法完全正确**：每一行代码都符合 JXA 的 ObjC bridge 规范
2. **API 完全正确**：`CGSessionCopyCurrentDictionary()` 是公共 API，文档齐全
3. **类型转换看似正确**：`NSDictionary.alloc.initWithDictionary()` 是标准的 CF→NS 桥接方式
4. **只在运行时暴露**：只有通过日志打印返回值，才能发现桥接层返回的是类型描述符而非字典内容

这个问题**不可能通过代码审查发现**，只有运行时日志才能暴露。

### 教训

> **不要假设跨版本的行为一致性。** JXA 的 ObjC bridge 是一层"薄冰"，Apple 从未正式承诺其稳定性。CFDictionary → NSDictionary 的 toll-free bridging 在原生代码中可靠，在 JXA 中则不然。

---

## 方案 C：间隙检测 / Gap Detection

### 原理

换一个思路：如果检测手段不可靠，能否从架构层面兜底？

假设 Raycast 后台命令在锁屏期间不会执行，那么当两次轮询的时间间隔远超正常值（如 > 90 秒，而正常是 60 秒），就可以推断 Mac 在此期间处于锁屏/休眠状态。

```typescript
const GAP_THRESHOLD_MS = 90 * 1000; // 90 秒

if (elapsed > GAP_THRESHOLD_MS && currentState === "unlocked" && prevState === "unlocked") {
  // 推断：发生了锁屏
  metrics.todayLockedMs += elapsed;
}
```

这个方案不需要任何锁屏检测 API，纯靠时间推理。

### 失败原因

**核心假设不成立。**

通过运行时日志确认：在 macOS 26 上，Raycast 的 `interval: "1m"` 后台命令在锁屏期间**仍然每 60 秒准时执行一次**，没有任何间隙。

日志证据：

```
t=291s → t=352s → t=412s → t=472s  （锁屏期间，间隔均为 ~60s）
```

也就是说，macOS 26 + Raycast 的组合下，后台任务不会因锁屏而暂停。间隙检测的前提完全不存在。

### 补充说明

间隙检测在当前代码中仍作为**兜底方案**保留，因为不同 macOS 版本、不同硬件的行为可能不同。在某些旧版本上，后台任务确实可能在锁屏时暂停。

### 教训

> **不要在未验证假设的情况下设计方案。** "锁屏时后台任务暂停"是一个合理的*猜测*，但它在 macOS 26 + Raycast 的环境下是*错误的*。正确的做法是先通过日志/实验验证假设，再设计方案。

---

## 方案 D：Swift + CGSessionCopyCurrentDictionary（最终方案）

### 原理

JXA 的问题在于桥接层，不在于 API 本身。那如果用一种**原生支持 CoreFoundation 桥接**的语言呢？

Swift 的 CF → Swift 桥接是语言核心特性，不经过任何中间层：

```swift
import CoreGraphics
import Foundation

if let cfDict = CGSessionCopyCurrentDictionary(),
   let dict = cfDict as? [String: Any] {
    let locked = dict["CGSSessionScreenIsLocked"] as? Bool ?? false
    let state = locked ? "locked" : "unlocked"
    let keys = Array(dict.keys)
    let info: [String: Any] = ["state": state, "keys": keys]
    if let jsonData = try? JSONSerialization.data(withJSONObject: info),
       let jsonStr = String(data: jsonData, encoding: .utf8) {
        print(jsonStr)
    }
}
```

在 Node.js 中通过 `execSync("swift -", { input: script })` 执行。

### 成功原因

1. **Swift 的 CF 桥接是原生支持的**：`CFDictionary as? [String: Any]` 是 Swift 语言的核心特性，不依赖第三方桥接层
2. **无需额外权限**：`CGSessionCopyCurrentDictionary()` 是公共 API，不需要 Automation 或 Accessibility 权限
3. **直接查询锁屏状态**：不是推断，而是直接读取系统会话的 `CGSSessionScreenIsLocked` 布尔值
4. **锁屏时字典内容变化**：解锁时 11 个键，锁屏时增加到 13 个键（新增 `CGSSessionScreenIsLocked` 和 `CGSSessionScreenLockedTime`）

### 验证

通过 debug.log 的运行时日志确认 Swift 检测正常工作：

```json
{
  "location": "detector.ts:swift-cgsession-result",
  "data": {
    "state": "unlocked",
    "keyCount": 11,
    "hasRealKeys": true,
    "hasLockedKey": false
  }
}
```

解锁时 11 个键、`hasLockedKey: false`；锁屏时 13 个键、`hasLockedKey: true`。检测完全准确。

### 性能数据

| 场景 | 耗时 |
|---|---|
| 首次编译 + 执行 | ~1.2s |
| 后续执行（编译缓存） | ~0.5-0.8s |
| 对 60 秒轮询间隔的影响 | 可忽略 |

> 注：Swift 解释器的启动开销在后续的 v0.0.3 性能优化中被重点处理。

---

## 方案对比总结

| 维度 | AppleScript | JXA + CGSession | Gap Detection | Swift + CGSession |
|---|---|---|---|---|
| **检测方式** | 间接推断 | 直接查询 | 时间推断 | 直接查询 |
| **macOS 26 兼容** | 部分 | ❌ | ❌ (假设不成立) | ✅ |
| **需要权限** | Automation | 无 | 无 | 无 |
| **锁屏期间可用** | 不确定 | 不可靠 | N/A | ✅ |
| **执行耗时** | ~1.2s | ~0.9s | 0ms | ~0.8s |
| **CF 桥接可靠性** | N/A | ❌ (JXA Bug) | N/A | ✅ (原生支持) |

**结论**：在 macOS 26+ 环境下，**Swift + CGSessionCopyCurrentDictionary 是唯一可靠的非特权锁屏检测方案**。

---

## 排查中的关键洞察

### 洞察 1：异步 fetch 在 Raycast no-view 命令中不可靠

在首轮 debug 中，我们使用 `fetch()` 发送日志到本地 HTTP 端点。结果发现：**前台命令（Lock Stats）的 fetch 日志全部到达，后台命令（update-lock-state）的 fetch 日志大部分丢失。**

原因：Raycast 的 no-view 后台命令在 async 函数返回后，Node.js 事件循环很快被清理。`fetch()` 是异步操作，尚未完成就被终止了。

**解决方案**：改用 `fs.appendFileSync()` 同步写文件。

> **在受限的运行时环境（Raycast no-view、Lambda、CLI）中，优先使用同步 I/O 进行关键操作。** 异步操作可能因进程提前退出而丢失。

### 洞察 2："看起来正确"和"运行时正确"是两回事

JXA 方案在代码层面看起来完全正确——正确的 API、正确的键名、正确的类型转换。但运行时日志揭示了一个完全意料之外的事实：桥接层返回的不是字典内容，而是类型描述符 `{__CFDictionary=}`。

这强化了一个 debug 原则：

> **对于系统级交互，永远不要只靠代码审查。必须通过运行时日志验证实际行为。**

### 洞察 3：useLockData Hook 的数据新鲜度问题

早期版本中，打开 Lock Stats 只从 LocalStorage 读取数据，不触发 `processStateChange()`。这意味着即使后台正确记录了锁屏时长，用户打开界面看到的仍是上一次读取的旧数据。

修复：在 `useLockData()` 的 `useEffect` 中先调用 `processStateChange()` 再 `revalidate()`。

> **数据展示层不能假设数据已经是最新的。** 如果数据的"生产者"和"消费者"是独立运行的（后台命令 vs 前台视图），消费者必须在展示前主动触发一次更新。

---

## 给后来者的建议

### macOS 锁屏检测的推荐方案

| macOS 版本 | 推荐方案 | 备注 |
|---|---|---|
| macOS 26+ (Tahoe) | **Swift + CGSessionCopyCurrentDictionary** | JXA ObjC bridge 不可靠 |
| macOS 13-15 | Swift 或 JXA + CGSession 均可 | 建议优先 Swift 以保前向兼容 |
| macOS 12 及以下 | AppleScript + 前台进程检测 | 旧方案仍可用 |

### 开发 macOS 系统级检测功能的五个原则

1. **优先使用原生语言调用系统 API**：Swift > JXA > AppleScript > Python (PyObjC)。每增加一层桥接，就增加一层不确定性。

2. **假设必须被验证**：不要假设"锁屏时后台任务不执行""CGSession 在所有 macOS 版本上行为一致"。通过日志验证每一个假设。

3. **错误回退值比成功路径更重要**：当检测失败时返回什么？`"unlocked"` 会让问题静默隐藏，`"保持上次状态"` 更安全。

4. **在受限运行时中使用同步 I/O**：Raycast no-view 命令、serverless 函数等环境中，异步操作可能不完成就被终止。

5. **多级检测，优雅降级**：不要只依赖一种检测方法。建立 Swift → AppleScript → Gap Detection 的降级链。

### Debug 方法论

本次排查最有价值的方法论是**假设驱动 + 运行时日志验证**：

1. 针对每个可能的原因，生成明确的假设（H1: Storage 读写异常？H2: 检测失败？H3: 状态机分支错误？……）
2. 为每个假设设计精确的日志插桩点
3. 通过一次运行，**同时验证/排除所有假设**
4. 基于日志证据（而非代码猜测）做出判断
5. 修复后保留日志进行验证，确认修复有效后再清理

---

## 最终架构

```
┌─────────────────────────────────────────────┐
│  update-lock-state (no-view, 60s interval)  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │  processStateChange()                 │  │
│  │  1. loadState() / loadMetrics()       │  │
│  │  2. detectLockStateWithInfo()         │  │
│  │     ├─ Swift + CGSession (主)         │  │
│  │     ├─ AppleScript (备用)             │  │
│  │     └─ fallback (保持上次状态)         │  │
│  │  3. 状态机分支判断                      │  │
│  │  4. saveState() / saveMetrics()       │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  lock-stats (view)                          │
│  useLockData()                              │
│    → processStateChange() → revalidate()    │
│                                             │
│  展示：todayLockedMs / lastLockDurationMs   │
│       / lastUnlockIntervalMs               │
└─────────────────────────────────────────────┘
```

---

## 附录：CGSession 字典键值参考

| 状态 | 键数量 | 特有键 |
|---|---|---|
| 解锁 | 11 | — |
| 锁屏 | 13 | `CGSSessionScreenIsLocked` (Bool), `CGSSessionScreenLockedTime` (Double) |

解锁时的 11 个键：

```
kCGSessionLongUserNameKey, kCGSSessionUserIDKey, kCGSessionLoginDoneKey,
kCGSSessionUserNameKey, kCGSSessionLoginwindowSafeLogin, kSCSecuritySessionID,
kCGSSessionOnConsoleKey, kCGSSessionSystemSafeBoot, CGSSessionUniqueSessionUUID,
kCGSSessionAuditIDKey, kCGSSessionGroupIDKey
```

锁屏时新增的 2 个键：
- `CGSSessionScreenIsLocked`：布尔值，`true` 表示锁屏
- `CGSSessionScreenLockedTime`：锁屏开始的时间戳（CFAbsoluteTime）

---

*本文对应版本变更：[v0.0.1 → v0.0.2](../../CHANGELOG.md)*
