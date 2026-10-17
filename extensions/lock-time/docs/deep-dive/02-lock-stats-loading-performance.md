# 从 3 秒到 0.5 秒：Raycast 扩展首屏加载性能优化实战

> Lock Time 的锁屏检测功能在 v0.0.2 修好后，用户反馈打开 `lock stats` 需要等 3 秒才能看到数据。本文记录了完整的性能分析过程：定位瓶颈、设计优化方案、以及在"数据实时性"和"用户体感"之间做出的权衡。

## 目录

- [问题现象](#问题现象)
- [性能剖析：3 秒花在哪里？](#性能剖析3-秒花在哪里)
- [核心瓶颈：Swift 解释器启动开销](#核心瓶颈swift-解释器启动开销)
- [优化思路：先展示缓存，后台静默更新](#优化思路先展示缓存后台静默更新)
- [优化一：调整 Hook 加载顺序](#优化一调整-hook-加载顺序)
- [优化二：检测结果短期缓存](#优化二检测结果短期缓存)
- [优化三：I/O 并行化与条件写入](#优化三io-并行化与条件写入)
- [未采用的方案](#未采用的方案)
- [优化效果](#优化效果)
- [权衡与思考](#权衡与思考)
- [总结](#总结)

---

## 问题现象

在 v0.0.2 中，锁屏检测已经完全正常工作（详见[上一篇 Debug 实录](01-debug-lock-detection-macos26.md)）。但一个新的体验问题浮现：

> 打开 Raycast，输入 `lock stats`，按下回车后……Loading 转圈……1 秒……2 秒……3 秒……数据才出来。

3 秒的等待在桌面工具的语境下是不可接受的。用户期望的是"唤起即见"的体验，而不是等待一个网页加载。

---

## 性能剖析：3 秒花在哪里？

### v0.0.2 的加载流程

打开 Lock Stats 视图时，`useLockData` Hook 的加载逻辑如下：

```typescript
// v0.0.2 的 useLockData Hook
useEffect(() => {
  processStateChange().then(() => revalidate());
}, []);
```

**串行执行**：先 `processStateChange()`，再 `revalidate()`。也就是说，用户必须等到状态机处理完成后，才能看到任何数据。

### 耗时分解

让我们拆解 `processStateChange()` 的每一步：

```
processStateChange() 总耗时 ~2.5s
├── loadState()              ~50ms    ← LocalStorage 读取
├── loadMetrics()            ~50ms    ← LocalStorage 读取（串行执行）
├── detectLockStateWithInfo()  ~1.5s  ← 🔴 主要瓶颈
│   └── execSync("swift -")  ~1.5s   ← Swift 解释器启动 + 脚本编译执行
├── 状态机分支判断               ~1ms
├── saveState()              ~50ms    ← LocalStorage 写入
└── saveMetrics()            ~50ms    ← LocalStorage 写入（串行执行）

revalidate() 总耗时 ~0.3s
├── loadState()              ~50ms
├── loadMetrics()            ~50ms    ← Promise.all 并行
└── React setState + render  ~200ms
```

**总计：~2.8 秒**，与用户观察到的 ~3 秒吻合。

### 瓶颈定位

从耗时分解可以清楚地看到：

| 步骤 | 耗时 | 占比 |
|---|---|---|
| Swift 脚本执行 | ~1.5s | **54%** |
| LocalStorage 串行读写 | ~0.25s | 9% |
| React 渲染 | ~0.2s | 7% |
| 其他（JSON 解析等） | ~0.05s | 2% |
| **可优化的等待时间** | **~0.8s** | **28%** |

最后一项"可优化的等待时间"是指：`processStateChange` 和 `revalidate` 之间的串行等待——`revalidate` 必须等 `processStateChange` 完成才开始，但其实它读取的是 LocalStorage 缓存数据，完全可以先执行。

---

## 核心瓶颈：Swift 解释器启动开销

为什么 Swift 脚本执行需要 1.5 秒？

```typescript
const rawOutput = execSync("swift -", {
  input: SWIFT_DETECT_SCRIPT,
  timeout: 10000,
  encoding: "utf-8",
});
```

`swift -` 命令的执行过程：

1. **启动 Swift 解释器进程**：~500ms（创建进程、加载运行时）
2. **即时编译（JIT）Swift 代码**：~500ms（解析、类型检查、编译）
3. **执行 CGSessionCopyCurrentDictionary()**：~10ms
4. **JSON 序列化 + 输出**：~5ms
5. **进程退出与清理**：~50ms

实际有用的工作（步骤 3-4）只需 15ms，但启动和编译的开销（步骤 1-2）占了 1 秒以上。

### 为什么不能避免这个开销？

在 v0.0.2 的[Debug 实录](01-debug-lock-detection-macos26.md)中我们已经论证过：Swift 是 macOS 26 上唯一可靠的锁屏检测方式。而 Raycast 扩展运行在 Node.js 环境中，无法直接调用 CoreGraphics API，只能通过 `execSync` 启动外部进程。

这意味着：**Swift 脚本的启动开销是结构性的，无法在当前架构下消除。**

那么，优化的方向就很清晰了：**不要让用户等这个开销。**

---

## 优化思路：先展示缓存，后台静默更新

核心洞察是：**用户打开 Lock Stats 时，LocalStorage 里已经有上次的数据了。**

后台命令 `update-lock-state` 每 60 秒运行一次，持续更新 LocalStorage 中的状态和指标。所以 LocalStorage 里的数据最多只落后 60 秒——对于"今天锁屏了多久"这样的统计指标，60 秒的延迟是完全可接受的。

优化策略：

```
v0.0.2 流程：
  processStateChange() (2.5s) → revalidate() (0.3s) → 显示
  用户等待：~3s

v0.0.3 流程：
  revalidate() (0.3s) → 显示       ← 用户立即看到缓存数据
  processStateChange() (2.5s) → revalidate() → 静默刷新
  用户等待：~0.3s
```

本质上是一个经典的 **stale-while-revalidate** 模式：先展示过期但可用的数据，后台更新后自动刷新。

---

## 优化一：调整 Hook 加载顺序

### 变更：`src/hooks/use-lock-data.ts`

**Before**（v0.0.2）：

```typescript
useEffect(() => {
  // 串行：先更新状态机，再加载数据
  processStateChange().then(() => revalidate());
}, [revalidate]);
```

**After**（v0.0.3）：

```typescript
useEffect(() => {
  (async () => {
    // 1. 先加载缓存数据（立即展示）
    await revalidate();

    // 2. 后台异步更新状态（不阻塞 UI）
    processStateChange().then(() => {
      // 状态更新后刷新显示
      revalidate();
    });
  })();
}, [revalidate]);
```

### 这段代码做了什么

1. **`await revalidate()`**：立即从 LocalStorage 读取上次的数据，渲染到界面上。耗时 ~0.3s。此时 `isLoading` 变为 `false`，用户看到数据。

2. **`processStateChange().then(() => revalidate())`**：在后台触发一次完整的状态检测。2.5 秒后完成，静默刷新界面。如果数据有变化（比如刚刚锁屏过），用户会看到数字自动更新。

### 效果

- **用户感知延迟**：从 ~3s 降至 ~0.3s
- **数据准确性**：后台更新后自动刷新，最终一致
- **首次使用的特殊情况**：如果是全新安装（LocalStorage 为空），`revalidate` 返回默认值（全零），但 2.5s 后 `processStateChange` 完成，数据自动刷新

---

## 优化二：检测结果短期缓存

### 场景分析

用户的一个典型操作模式：

```
打开 lock stats → 看了一眼 → 关闭 → 2 秒后又打开看
```

在 v0.0.2 中，每次打开都会触发 `processStateChange()`，也就是每次都执行 Swift 脚本。2 秒内两次执行是完全不必要的——锁屏状态不可能在 2 秒内发生有意义的变化。

### 变更：`src/lib/detector.ts`

在 `detectLockStateWithInfo()` 中添加 5 秒缓存：

```typescript
let cachedResult: { result: DetectResult; timestamp: number } | null = null;
const CACHE_DURATION_MS = 5000; // 5 秒缓存

export function detectLockStateWithInfo(skipCache = false): DetectResult {
  // 检查缓存（5 秒内直接返回）
  if (!skipCache && cachedResult) {
    const age = Date.now() - cachedResult.timestamp;
    if (age < CACHE_DURATION_MS) {
      return cachedResult.result;
    }
  }

  // 执行检测并缓存结果
  const swiftResult = detectViaSwiftCGSession();
  if (swiftResult) {
    cachedResult = { result: swiftResult, timestamp: Date.now() };
    return swiftResult;
  }

  // ... AppleScript 备用 ...
}
```

### 设计要点

**为什么是 5 秒？**

- 后台命令每 60 秒轮询一次，5 秒缓存不会影响后台检测的准确性（下次轮询时缓存早已过期）
- 5 秒足以覆盖"快速切换视图"的场景
- 5 秒不会导致锁屏状态检测延迟过大

**`skipCache` 参数**

手动诊断（`Cmd+T`）需要获取实时检测结果，因此支持跳过缓存：

```typescript
// lock-stats.tsx 中
const result = detectLockStateWithInfo(true); // 强制重新检测
```

**失败结果不缓存**

如果检测失败，不写入缓存，让下次调用重试。这样在检测恢复正常时能立即生效，而不必等待 5 秒过期。

### 效果

- **5 秒内重复打开**：检测耗时从 ~1.5s 降至 ~0ms
- **对后台命令无影响**：60 秒间隔远大于 5 秒缓存窗口

---

## 优化三：I/O 并行化与条件写入

### 变更：`src/lib/state-machine.ts`

**问题 1：串行读取**

```typescript
// v0.0.2：串行执行，第二个等第一个完成
const prevState = await loadState();
const metrics = await loadMetrics();
```

**优化为并行读取**：

```typescript
// v0.0.3：并行执行
const [prevState, metrics] = await Promise.all([loadState(), loadMetrics()]);
```

两次 LocalStorage 读取没有依赖关系，完全可以并行。

**问题 2：无条件写入**

```typescript
// v0.0.2：每次都写入两份数据
await saveState(newState);
await saveMetrics(metrics);
```

在 `unlocked → unlocked (no-gap)` 的常见场景下，metrics 完全没有变化，但仍然执行了一次 JSON 序列化 + LocalStorage 写入。

**优化为条件写入**：

```typescript
// v0.0.3：跟踪变化，条件写入
let metricsChanged = false;

if (prevState.current !== currentLockState) {
  // 状态变化时更新 metrics
  metricsChanged = true;
} else if (currentLockState === "locked") {
  // 持续锁屏时更新 metrics
  metricsChanged = true;
}

// 只在有变化时写入 metrics
if (metricsChanged) {
  await Promise.all([saveState(newState), saveMetrics(metrics)]);
} else {
  await saveState(newState); // 只写入 state 时间戳
}
```

### 效果

- Storage 读取时间减半（并行化）
- 大部分轮询（unlocked → unlocked）少一次 Storage 写入
- 总计节省 ~50-100ms

> 这个优化的绝对收益不大（100ms 级别），但在"每一毫秒都影响体感"的首屏加载场景中，积少成多。

---

## 未采用的方案

在设计优化方案时，我们也考虑了以下替代方案，最终出于各种原因未采用：

### 预编译 Swift 脚本为可执行文件

将 Swift 脚本编译为独立的二进制文件（`swiftc -o detect-lock detect.swift`），运行时直接执行编译好的二进制，启动速度可降至 ~100ms。

**未采用原因**：
- Raycast 扩展的分发机制不适合打包二进制文件
- 需要为不同架构（x86/ARM）分别编译
- Raycast Store 审核可能不通过（安全考虑）
- 增加了构建和维护的复杂度

### Node.js Native Addon

通过 C/C++ 或 Rust 编写 Native Addon，在 Node.js 进程内直接调用 CoreGraphics API，消除进程启动开销。

**未采用原因**：
- Raycast 扩展环境不支持加载 Native Addon
- 编译、分发、跨版本兼容都是问题

### WebSocket/IPC 常驻进程

启动一个常驻的 Swift 进程，通过 WebSocket 或 Unix Socket 与 Node.js 通信。启动开销变成一次性的。

**未采用原因**：
- 架构复杂度大幅增加
- 常驻进程的资源消耗和生命周期管理
- Raycast 扩展规范不鼓励启动额外进程

### 结论

**在 Raycast 扩展的约束下，"缓存 + 异步更新"是最务实的优化策略。** 它不改变架构，不引入新的依赖，不违反平台规范，同时能将用户感知延迟降低 80%+。

---

## 优化效果

### 量化对比

| 场景 | v0.0.2 | v0.0.3 | 改善 |
|---|---|---|---|
| 首次打开 Lock Stats | ~3.0s | ~0.3s | **90% ↓** |
| 5 秒内重复打开 | ~3.0s | <0.1s | **97% ↓** |
| Menu Bar 打开 | ~3.0s | ~0.3s | **90% ↓** |
| 手动 Update Now (Cmd+U) | ~3.0s | ~2.5s | 17% ↓ |
| 后台轮询 | ~2.5s/次 | ~2.0s/次 | 20% ↓ |

### 用户体验流程对比

**v0.0.2**（等 3 秒）：

```
用户输入 "lock stats" → Loading... (3s) → 数据显示
```

**v0.0.3**（即时展示）：

```
用户输入 "lock stats" → 缓存数据显示 (0.3s) → 后台静默更新 → 数据自动刷新
```

### 感知延迟分级

```
⚡ 瞬间 (<100ms)  → 完美体验
✅ 快速 (100-500ms) → 优秀体验  ← v0.0.3 首次打开
🟡 可接受 (500ms-1s) → 良好体验
🟠 稍慢 (1-2s)    → 可以忍受
❌ 缓慢 (>2s)     → 体验差    ← v0.0.2 首次打开
```

---

## 权衡与思考

### 数据新鲜度 vs 响应速度

这是本次优化中最核心的权衡。

**v0.0.2 的设计哲学**：数据必须实时——打开就看到最新的。代价是 3 秒的等待。

**v0.0.3 的设计哲学**：先看到数据比看到最新数据更重要。用户先看到上次的缓存（最多落后 60 秒），后台静默更新后数据自动刷新。

**为什么这个权衡是合理的？**

1. **数据类型决定了容忍度**：Lock Time 展示的是"今天累计锁屏时长"这样的统计指标，60 秒的延迟对用户决策没有任何影响。这不是股票行情，不需要毫秒级实时。

2. **后台命令保证了数据不会太旧**：`update-lock-state` 每 60 秒运行一次，LocalStorage 里的数据总是在过去 60 秒内更新的。

3. **最终一致性**：2.5 秒后后台更新完成，界面自动刷新。如果数据确实有变化，用户会看到数字跳动——这反而给了一种"正在实时追踪"的反馈感。

### 缓存带来的特殊场景

**场景：用户刚锁屏 5 分钟，解锁后立即打开 Lock Stats**

- v0.0.2：等 3 秒，直接看到正确的数据
- v0.0.3：先看到旧数据（锁屏前的），2.5 秒后数据自动更新为正确值

v0.0.3 在这个场景下有一个短暂的"数据不准"窗口，但：
1. 只有 2.5 秒，用户很可能还在阅读界面标题
2. 数据更新后会自动刷新，不需要手动操作
3. 如果用户需要立即看到最新数据，可以按 `Cmd+U` 手动更新

### 检测缓存的安全性

5 秒的检测缓存是否会影响锁屏检测的准确性？

**不会。** 原因是：
- 后台命令的轮询间隔是 60 秒，远大于 5 秒缓存窗口
- 5 秒缓存只影响前台视图打开时的检测，不影响后台定时检测
- 锁屏/解锁是一个低频事件（分钟级别），5 秒的延迟在统计意义上可忽略

---

## 总结

### 优化策略矩阵

```
┌─────────────────────────────────────────────────────┐
│              Lock Stats 性能优化策略                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  优化一：加载顺序重排                                │
│  ┌─────────────────────────────────────────┐       │
│  │ Before: detect → load → render          │       │
│  │ After:  load → render → detect → refresh│       │
│  │ 效果：首屏 3s → 0.3s                    │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  优化二：检测结果缓存                                │
│  ┌─────────────────────────────────────────┐       │
│  │ 5 秒内重复检测 → 返回缓存                │       │
│  │ 效果：重复打开 3s → <0.1s               │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
│  优化三：I/O 并行化                                  │
│  ┌─────────────────────────────────────────┐       │
│  │ Storage 并行读写 + 条件写入              │       │
│  │ 效果：节省 ~100ms                       │       │
│  └─────────────────────────────────────────┘       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 核心理念

> **先快速响应用户，再在后台默默完善数据。**

这不是偷懒，而是一种设计选择：在"完美准确"和"即时可用"之间，对于统计类数据，后者几乎总是更重要的。

这个模式在 Web 开发中有一个广为人知的名字——**stale-while-revalidate**。它被广泛应用在 SWR、React Query 等数据获取库中。我们只是把同样的思路应用到了 Raycast 扩展的本地数据加载场景。

### 回顾

三个版本的演进路线：

| 版本 | 核心问题 | 核心解决方案 |
|---|---|---|
| v0.0.1 | 锁屏检测方案不可靠 | AppleScript（有缺陷） |
| v0.0.2 | macOS 26 上检测完全失效 | Swift + CGSession + 多级降级 |
| v0.0.3 | 首屏加载 3 秒太慢 | 缓存优先 + 后台异步更新 |

每一次迭代都在解决上一个版本的"最大痛点"：先保证功能正确（v0.0.2），再追求体验流畅（v0.0.3）。这也是产品开发的常见节奏：**Make it work → Make it right → Make it fast。**

---

*本文对应版本变更：[v0.0.2 → v0.0.3](../../CHANGELOG.md)*
