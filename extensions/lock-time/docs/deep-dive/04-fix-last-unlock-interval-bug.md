# lastChangeAt 的语义陷阱：两个 "~60 秒" Bug 的排查与修复

> Lock Time 的核心指标 Last Unlock Interval 永远显示约 60 秒——无论用户实际工作了 5 分钟还是 2 小时。通过 Cursor Debug Mode 的假设驱动排查，我们定位到根因：一个字段的"命名语义"与"运行时行为"产生了微妙的分裂。修复第一个 Bug 后，排查过程中产出的分析文档精准预测了第二个同根 Bug（lastLockDurationMs），随后被开发者独立发现并一并修复——这是一次 Debug Mode 方法论价值的完整体现。

## 目录

- [问题现象](#问题现象)
- [预期行为 vs 实际行为](#预期行为-vs-实际行为)
- [代码审查：看起来完全正确](#代码审查看起来完全正确)
- [假设驱动的排查](#假设驱动的排查)
- [运行时日志揭示真相](#运行时日志揭示真相)
- [根因：lastChangeAt 的语义分裂](#根因lastchangeat-的语义分裂)
- [修复一：lastUnlockIntervalMs](#修复一lastunlockintervalms)
- [修复一验证](#修复一验证)
- [一个意外发现：编译缓存的坑](#一个意外发现编译缓存的坑)
- [修复二：lastLockDurationMs — 从"潜在风险"到"一拍即合"](#修复二lastlockdurationms--从潜在风险到一拍即合)
- [修复二验证](#修复二验证)
- [教训与方法论](#教训与方法论)

---

## 问题现象

Lock Time 上架 Raycast Store 后，在日常使用中发现一个异常：

- **Last Unlock Interval 永远显示约 59s ~ 61s**
- 无论实际连续工作了 5 分钟、30 分钟还是 2 小时，值始终在 60 秒左右
- Last Lock Duration 和 Today Locked Time 均正常
- 锁屏/解锁检测正常，状态切换正确

截图中 Last Lock Duration 显示 1h 21m（合理），但 Last Unlock Interval 只有 59s——这显然不对。用户不可能只工作了 59 秒就锁屏。

**直觉判断**：59 秒 ≈ 后台轮询间隔（60 秒）。这个巧合高度可疑。

---

## 预期行为 vs 实际行为

根据 [PRD](../PRD/lock-time.md) 定义：

| 指标 | 定义 | 预期值示例 |
|---|---|---|
| Last Lock Duration | 最近一次 LOCKED → UNLOCKED 的持续时间 | 1h 21m ✅ |
| **Last Unlock Interval** | **最近一次 UNLOCKED → LOCKED 的持续时间** | **应为数分钟到数小时** |

Last Unlock Interval 代表用户从解锁到再次锁屏的**连续工作时间**，是 Lock Time 的核心差异指标。它永远显示 ~60s，意味着这个指标完全失去了意义。

---

## 代码审查：看起来完全正确

查看 `state-machine.ts` 中 UNLOCKED → LOCKED 的处理逻辑：

```typescript
const elapsed = now - prevState.lastChangeAt;

if (prevState.current === "unlocked" && currentLockState === "locked") {
  metrics.lastUnlockIntervalMs = elapsed;  // ← 看起来完全正确
}
```

`elapsed` = 当前时间 - 上一次状态变更时间。当从 UNLOCKED 变为 LOCKED 时，`elapsed` 应该就是解锁持续时长。

**逻辑无懈可击。**

但 59 秒的值告诉我们：`elapsed` 并不是我们以为的那个值。

---

## 假设驱动的排查

使用 Cursor Debug Mode 进行系统性排查，生成 5 个假设并行验证：

| 假设 | 描述 |
|---|---|
| **H-A** | `lastChangeAt` 在 UNLOCKED→UNLOCKED（持续解锁）时被覆盖为 `now`，导致 UNLOCKED→LOCKED 时 `elapsed` 只有 ~60s |
| **H-B** | UNLOCKED→LOCKED 走了 Gap Detection 分支（elapsed > 90s），`lastUnlockIntervalMs` 被设为 0 |
| **H-C** | `useLockData` Hook 在打开 Lock Stats 时调用 `processStateChange()`，额外触发了一次 UNLOCKED→UNLOCKED，覆盖了 `lastChangeAt` |
| **H-D** | `lastLockDurationMs` 也有相同问题，只是当前因 Mac 锁屏后休眠而碰巧正确（后续被独立验证并修复，见[修复二](#修复二lastlockdurationms--从潜在风险到一拍即合)） |
| **H-E** | `metrics.lastLockEndAt`（LOCKED→UNLOCKED 时记录的解锁时间戳）可作为正确的计算依据 |

在 `state-machine.ts` 的 5 个关键位置插入运行时日志，一次运行同时验证所有假设。

---

## 运行时日志揭示真相

### 关键日志序列

用户在 13:41 解锁后，持续工作到 13:56 锁屏。以下是这段时间的运行时日志（已简化）：

```
13:49:40  UNLOCKED→UNLOCKED  lastChangeAt=13:49:40 → 覆盖为 13:49:40
13:50:40  UNLOCKED→UNLOCKED  lastChangeAt=13:49:40 → 覆盖为 13:50:40
13:51:41  UNLOCKED→UNLOCKED  lastChangeAt=13:50:40 → 覆盖为 13:51:41
13:52:42  UNLOCKED→UNLOCKED  lastChangeAt=13:51:41 → 覆盖为 13:52:42
13:53:43  UNLOCKED→UNLOCKED  lastChangeAt=13:52:42 → 覆盖为 13:53:43
13:54:43  UNLOCKED→UNLOCKED  lastChangeAt=13:53:43 → 覆盖为 13:54:43
13:55:44  UNLOCKED→UNLOCKED  lastChangeAt=13:54:43 → 覆盖为 13:55:44
13:56:44  UNLOCKED→LOCKED    elapsed = 13:56:44 - 13:55:44 = 60s  ← BUG!
                              lastLockEndAt = 13:41:36 (真实解锁时间)
                              now - lastLockEndAt = 908s ≈ 15m 8s  ← 正确值!
```

### 假设评估

| 假设 | 结论 | 日志证据 |
|---|---|---|
| **H-A** | **CONFIRMED** ✅ | 7 次 UNLOCKED→UNLOCKED 都触发了 "lastChangeAt will be overwritten" 日志。最终 UNLOCKED→LOCKED 时 `elapsed=60s` |
| **H-B** | **REJECTED** ❌ | 无 Gap 分支日志。`elapsed=60s < 90s 阈值`，走的是正常分支 |
| **H-C** | **PARTIALLY CONFIRMED** ⚠️ | useLockData 确实触发了额外的 processStateChange，造成更多的 `lastChangeAt` 覆盖，但不是根因 |
| **H-D** | **CONFIRMED** ✅ | Mac 在锁屏期间进入休眠（无 LOCKED→LOCKED 中间 poll），所以 `lastLockDurationMs` 碰巧正确。该预测后续在[修复二](#修复二lastlockdurationms--从潜在风险到一拍即合)中被独立验证 |
| **H-E** | **CONFIRMED** ✅ | `lastLockEndAt=13:41:36` 正确记录了解锁时刻，`now - lastLockEndAt = 908s` 是正确的 unlock interval |

---

## 根因：lastChangeAt 的语义分裂

### 字段定义

```typescript
export interface StateData {
  current: LockState;
  /** 上一次状态变更时间戳（Unix ms） */
  lastChangeAt: number;  // ← 名字说的是"状态变更"时间
}
```

### 实际行为

在 `processStateChange()` 末尾，**无论状态是否变化**，都会执行：

```typescript
const newState: StateData = {
  current: currentLockState,
  lastChangeAt: now,  // ← 每次 poll 都更新为当前时间
};
await saveState(newState);
```

这意味着 `lastChangeAt` 的实际语义不是"上一次状态变更时间"，而是**"上一次 poll 执行时间"**。

### 为什么 LOCKED→LOCKED 需要这样做

在 LOCKED→LOCKED（持续锁屏）场景中，代码会增量累加 `todayLockedMs`：

```typescript
} else if (currentLockState === "locked") {
  const todayPortion = getTodayPortionMs(prevState.lastChangeAt, now);
  metrics.todayLockedMs += todayPortion;  // 增量累加
}
```

每次 poll 累加 `now - lastChangeAt` 的时长，然后更新 `lastChangeAt = now`，避免下次重复累加。这个设计是**正确且必要**的。

### 问题：UNLOCKED→UNLOCKED 不需要这样做

UNLOCKED→UNLOCKED 场景不需要累加任何时长（解锁期间不计算锁屏时长），但代码仍然更新 `lastChangeAt = now`。这导致了一个严重的副作用：

```
解锁时间点（真实）  ←── 这个时间被遗忘了
   ↓
   T+0s:   lastChangeAt = T     (状态变更时刻)
   T+60s:  lastChangeAt = T+60  (被覆盖！)
   T+120s: lastChangeAt = T+120 (被覆盖！)
   T+180s: lastChangeAt = T+180 (被覆盖！)
   T+240s: 检测到锁屏 → elapsed = now - T+180 = 60s ← BUG
```

`lastChangeAt` 的语义从"状态变更时间"静默降级为"最近一次 poll 时间"，而 `elapsed` 的计算代码仍然假设它是"状态变更时间"。

### 为什么代码审查无法发现

这个 Bug 的隐蔽性在于：

1. **代码语法完全正确**：`elapsed = now - prevState.lastChangeAt` 没有任何语法错误
2. **逻辑推导看似正确**：UNLOCKED→LOCKED 时，`elapsed` "应该"是解锁持续时长
3. **字段名具有误导性**：`lastChangeAt` 暗示"上一次变更"，但实际上每次 poll 都在更新
4. **Bug 只在特定时序下暴露**：需要至少 2 次 UNLOCKED→UNLOCKED poll 后再锁屏才能观察到
5. **值不是零**：~60s 看起来像是一个"真实但偏小"的值，不像典型的 Bug 那样显示 0 或 NaN

---

## 修复一：lastUnlockIntervalMs

### 核心洞察

`metrics.lastLockEndAt` 在 LOCKED→UNLOCKED 转换时被设置为 `now`——它精确记录了用户**解锁的时刻**。这个值不会被 poll 覆盖，因为只有状态转换时才会设置它。

### 修复代码

```typescript
// Before (Bug):
metrics.lastUnlockIntervalMs = elapsed;
// elapsed = now - lastChangeAt ≈ 60s (最后一次 poll 间隔)

// After (Fix):
metrics.lastUnlockIntervalMs =
  metrics.lastLockEndAt > 0 ? now - metrics.lastLockEndAt : elapsed;
// now - lastLockEndAt = 真实的解锁持续时长
// fallback: 首次运行时 lastLockEndAt 为 0，使用 elapsed
```

**改动量：1 行。** 修复点极其精确。

---

## 修复一验证

### 验证日志对比

修复后通过运行时日志验证：

**Before（修复前）：**

```
13:56:44  UNLOCKED→LOCKED
  elapsed = 59718 (≈60s)
  lastUnlockIntervalMs 被设为: 59718  ← ❌ 只是一个 poll 间隔
```

**After（修复后）：**

```
14:31:58  UNLOCKED→LOCKED
  elapsed = 60012 (≈60s, 仍然是错误值)
  lastLockEndAt = 14:23:41 (真实解锁时间)
  assignedValue = 496711 (≈8m 17s)  ← ✅ 使用 now - lastLockEndAt
  usedLastLockEndAt = true
```

修复后的赋值日志（`FIX_VERIFY`）确认：

- `assignedValue: 496711`（≈8 分 17 秒），而非 `elapsed: 60012`（≈60 秒）
- `usedLastLockEndAt: true`，走了正确的计算路径
- 下一次 `processStateChange` 读取 storage 验证：`lastUnlockIntervalMs: 496711` ✅

### UI 验证

修复后 Lock Stats 界面显示 **Last Unlock Interval: 17m 34s**，与实际工作时间吻合。

---

## 一个意外发现：编译缓存的坑

修复过程中遇到了一个"修复已写入源码但运行时未生效"的问题。

日志显示 debug 插桩代码正常执行（说明代码被重新编译了），但修复逻辑的赋值结果仍然是旧值。原因是 Raycast 的后台命令可能缓存了旧的编译产物。

**解决方案**：显式执行 `npm run build` 强制重新编译，而不是依赖 Raycast 的自动编译机制。

> **在 Raycast 扩展开发中，如果修改了后台命令（no-view）的代码，建议显式 `npm run build` 确保编译产物更新。** 前台视图（view）的热更新通常没问题，但后台命令的编译缓存可能更激进。

---

## 修复二：lastLockDurationMs — 从"潜在风险"到"一拍即合"

### 文档预测

在完成修复一并输出本文的初稿时，我在分析中写下了这样一段：

> **潜在风险：lastLockDurationMs 的同类隐患。** 同样的 `lastChangeAt` 语义问题理论上也影响 `lastLockDurationMs`。Mac 在锁屏后通常会进入休眠，休眠期间后台 interval 不执行，因此没有 LOCKED→LOCKED 的中间 poll，`lastChangeAt` 保持为锁屏开始时间。但这只是"碰巧正确"。

这段分析当时被归类为"留待未来修复"。

### 开发者独立发现

文档刚输出不久，开发者在查看 Today Sessions 列表时，独立注意到 Last Lock Duration 的数据可能存在同样的问题。此时开发者还没有读到文档中的"潜在风险"章节。

当两个视角汇合时——文档的理论分析与开发者的直觉判断指向了同一个问题。**双向奔赴，一拍即合。**

于是决定立即修复，而非"留待未来"。

### 问题分析

LOCKED → UNLOCKED 路径中有 **4 个值**受同一根因影响：

```typescript
// LOCKED → UNLOCKED
metrics.lastLockDurationMs = elapsed;              // ← elapsed 被 poll 覆盖
metrics.lastLockStartAt = prevState.lastChangeAt;  // ← lastChangeAt 被 poll 覆盖
const todayPortion = getTodayPortionMs(prevState.lastChangeAt, now); // ← 同上
const sessionLockAt = Math.max(prevState.lastChangeAt, todayStartMs); // ← 同上
appendTodaySession(metrics, sessionLockAt, now, todayPortion);
```

如果锁屏期间有 LOCKED→LOCKED poll（macOS 26 上锁屏但未休眠时会发生）：

| 数据 | Bug 值 | 正确值 |
|---|---|---|
| `lastLockDurationMs` | ≈ 60s | 完整锁屏时长 |
| `lastLockStartAt` | 最后一次 poll 时间 | 锁屏开始时间 |
| session 的 `lockAt` | 最后一次 poll 时间 | 锁屏开始时间 |
| session 的 `durationMs` | ≈ 60s | 完整锁屏时长 |

唯一**不受影响**的是 `todayLockedMs`——它通过 LOCKED→LOCKED 增量累加，总和始终正确。

### 修复方案

修复思路与修复一对称：在 UNLOCKED→LOCKED 时记录锁屏开始时间，在 LOCKED→UNLOCKED 时使用它。

**步骤 1：UNLOCKED → LOCKED 时记录真实锁屏开始时间**

```typescript
// 正常分支
metrics.lastLockStartAt = now;

// Gap 分支（推断锁屏开始于间隙起点）
metrics.lastLockStartAt = prevState.lastChangeAt;
```

**步骤 2：LOCKED → UNLOCKED 时使用 lastLockStartAt**

```typescript
// Before (Bug):
metrics.lastLockDurationMs = elapsed;
metrics.lastLockStartAt = prevState.lastChangeAt;
const sessionLockAt = Math.max(prevState.lastChangeAt, todayStartMs);
appendTodaySession(metrics, sessionLockAt, now, todayPortion);

// After (Fix):
const lockStartAt = metrics.lastLockStartAt > 0
  ? metrics.lastLockStartAt : prevState.lastChangeAt;
metrics.lastLockDurationMs = now - lockStartAt;
metrics.lastLockStartAt = lockStartAt;
const sessionLockAt = Math.max(lockStartAt, todayStartMs);
const sessionDuration = getTodayPortionMs(lockStartAt, now);
appendTodaySession(metrics, sessionLockAt, now, sessionDuration);
```

注意 `todayLockedMs` 的增量累加**保持不变**——它依赖 `prevState.lastChangeAt` 是正确的，因为每次 LOCKED→LOCKED 已经增量计入了。

---

## 修复二验证

运行时日志确认修复有效：

```
15:37:21  UNLOCKED→LOCKED (lastLockStartAt = 15:37:21 记录)
  ... 锁屏期间有 1 次 LOCKED→LOCKED poll ...
15:39:38  LOCKED→UNLOCKED
  lockStartAt = 15:37:21 (真实锁屏开始时间) ✅
  prevLastChangeAt = 15:39:22 (最后一次 poll 时间，已被覆盖)
  lockDurationMs = 137323 (≈2m 17s) ✅
  elapsed = 16391 (≈16s，旧代码会用这个值) ❌
  usedLastLockStartAt = true
```

**关键对比**：`lockDurationMs: 137323`（≈2m 17s）vs `elapsed: 16391`（≈16s）。旧代码会显示 16 秒，修复后正确显示 2 分 17 秒。

两个修复的**对称关系**：

| 维度 | 修复一：lastUnlockIntervalMs | 修复二：lastLockDurationMs |
|---|---|---|
| 受影响的转换 | UNLOCKED → LOCKED | LOCKED → UNLOCKED |
| 被 poll 覆盖的场景 | UNLOCKED→UNLOCKED | LOCKED→LOCKED |
| 正确的时间戳来源 | `metrics.lastLockEndAt` | `metrics.lastLockStartAt` |
| 记录时机 | LOCKED→UNLOCKED 时记录 | UNLOCKED→LOCKED 时记录 |
| 改动量 | 1 行 | ~10 行（含 session 修复） |

---

## 教训与方法论

### 教训 1：字段的"名字"不等于字段的"行为"

`lastChangeAt` 这个名字暗示"上一次状态变更时间"，但它实际上在每次 poll 时都会更新。名字给了开发者一个错误的心理模型，而代码审查时会自然地基于这个心理模型推导逻辑——推导结果当然是"正确"的。

> **当一个字段的实际行为偏离了它的命名语义时，所有基于命名语义的推理都会得出错误结论。** 这类 Bug 是代码审查的盲区，只有运行时日志能暴露。

### 教训 2：值域异常是最强的线索

59 秒 ≈ 60 秒轮询间隔。这个巧合不是偶然的——它直接指向了"值来源于 poll 间隔而非业务逻辑"的根因。

> **当一个 Bug 值与某个系统常量高度吻合时，几乎可以断定该值的计算路径引用了那个常量的来源。** 顺着这条线索逆向追踪，通常能快速定位根因。

### 教训 3：Debug Mode 的假设驱动方法

本次排查使用了 Cursor Debug Mode 的标准流程：

1. **生成 3~5 个假设**，覆盖不同子系统（状态机、gap 检测、Hook 竞争、编译缓存、替代计算路径）
2. **多个位置插桩**，一次运行并行验证所有假设
3. **基于日志证据逐一评估**：CONFIRMED / REJECTED / INCONCLUSIVE
4. **只修复有运行时证据支持的假设**，不做猜测性修复
5. **修复后保留插桩验证**，通过 before/after 日志对比确认修复有效
6. **验证成功后清理插桩**

两轮修复都遵循了这个流程。修复一经历了 3 轮迭代（定位 → 修复未生效 → 强制编译后验证成功），修复二基于修复一的根因分析直接命中，1 轮验证即通过。整个 debug 方法的核心始终是：**不信代码，只信运行时数据。**

### 教训 4：已有字段是最好的修复素材

修复一不需要引入新的数据结构或新的存储字段。`metrics.lastLockEndAt` 已经存在，已经在正确的时机被赋值，只是没有在计算 `lastUnlockIntervalMs` 时被利用。修复二中的 `metrics.lastLockStartAt` 同理——字段已存在，只需在正确的时机赋值并在正确的地方使用。

> **修复 Bug 时，优先检查现有数据结构中是否已经有正确的信息。** 引入新字段意味着更多的迁移和兼容性工作。用好已有的字段，修复可以精确到一行代码。

### 教训 5：排查文档本身就是高价值产出

修复一完成后输出的排查文档中，"潜在风险"章节通过理论推导预测了修复二的 Bug。这个预测在数小时内被开发者独立验证——文档从"事后记录"升级为"主动发现问题的工具"。

> **深度排查产出的文档不只是归档用的。** 当你系统性地分析一个 Bug 的根因时，自然会看到同一根因影响的其他代码路径。把这些观察写下来，它们就是下一个 Bug 的预警信号。这一次，从"潜在风险"到"一拍即合"只隔了几分钟。

### 教训 6：对称性是代码质量的试金石

两个 Bug 呈完美的镜像对称——一个在 UNLOCKED→LOCKED 路径，一个在 LOCKED→UNLOCKED 路径；一个用 `lastLockEndAt`，一个用 `lastLockStartAt`；一个因为 UNLOCKED→UNLOCKED poll 被覆盖，一个因为 LOCKED→LOCKED poll 被覆盖。

> **当你修复了一个方向上的 Bug 时，立刻检查对称方向。** 状态机的两个方向通常共享相同的设计模式和相同的设计缺陷。这不是"以防万一"，而是几乎必然存在的同根问题。

---

*本文对应的代码修改：`src/lib/state-machine.ts` 中 UNLOCKED→LOCKED 分支（`lastUnlockIntervalMs` 和 `lastLockStartAt`）及 LOCKED→UNLOCKED 分支（`lastLockDurationMs`、session 计算）的计算方式。*
*前三篇：*
- *[01 — Debug 实录：macOS 26 上锁屏检测排查与修复](01-debug-lock-detection-macos26.md)*
- *[02 — 从 3 秒到 0.5 秒：首屏加载性能优化实战](02-lock-stats-loading-performance.md)*
- *[03 — 从零到 Store：Raycast Extension 开发与发布全记录](03-first-raycast-extension-to-store.md)*
