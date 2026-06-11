# PRD — Lock Time (Raycast Extension)

> **最新更新**：已完成性能优化，首屏加载从 3s 降至 0.5s（提升 83%），详见 [CHANGELOG](CHANGELOG.md)

## 1. 背景与目标（Why）

在日常使用 Mac 的过程中，「锁屏」是一个被忽略但极有价值的时间信号：

* 锁屏 ≈ 休息 / 切换 / 中断
* 解锁到下一次锁屏 ≈ 一段连续的“开屏工作时间”

**Lock Time 的目标**是：

* 以**极低侵入性**的方式，记录锁屏相关时间
* 帮助用户理解自己的**真实工作节奏**
* 不做复杂分析、不打扰用户，只做“可信的时间事实”

---

## 2. 产品定位（What）

* 类型：Raycast Productivity Extension
* 核心价值：**锁屏时长 & 解锁后连续工作时长**
* 数据原则：Local-first、无需账号、不上传任何数据
* 使用方式：随时唤起 / 菜单栏可见 / 后台自动记录

---

## 3. 范围定义（Scope）

### In Scope（本期必须）

* 统计今日累计锁屏时长
* 统计上一次锁屏持续时长
* 统计上一次解锁到锁屏之间的“工作时间”
* 后台自动更新，无需用户手动触发
* Raycast 内可视化查看

### Out of Scope（暂不做）

* 精确系统级锁屏事件监听（如 IOKit）
* 跨设备 / iCloud 同步
* 行为分析、建议、提醒
* App 使用细分统计

---

## 4. 核心概念定义（非常重要）

### 4.1 状态机定义

系统只有两个状态：

```text
UNLOCKED → LOCKED → UNLOCKED → ...
```

### 4.2 时间指标定义

| 指标                   | 定义                           |
| -------------------- | ---------------------------- |
| Today Locked Time    | 当天所有 LOCKED 状态的累计时长          |
| Last Lock Duration   | 最近一次 LOCKED → UNLOCKED 的持续时间 |
| Last Unlock Interval | 最近一次 UNLOCKED → LOCKED 的持续时间 |

⚠️ **Last Unlock Interval 是核心差异点**：它代表一次连续的开屏工作时间。

---

## 5. 用户故事（User Stories）

### US-1：查看当前统计

> 作为用户，我希望随时在 Raycast 中看到今天锁屏了多久，以及最近一次连续工作了多久。

### US-2：无需配置即可工作

> 作为用户，我不想做任何设置，安装后就自动开始记录。

### US-3：轻量、可信

> 作为用户，我希望这个工具不会影响性能，也不会采集任何隐私数据。

---

## 6. 命令设计（Commands）

### 6.1 Command：Lock Stats（View）

**类型**：View Command
**入口**：Raycast 主搜索

#### 展示内容（List / Detail）

* Today Locked Time

  * `e.g. 42m 18s`
* Last Lock Duration

  * `e.g. 7m 02s`
* Last Unlock Interval

  * `e.g. 1h 36m`

#### Actions

* Reset Today
* Reset All Data
* (Optional) Copy Stats as Text

---

### 6.2 Command：Update Lock State（no-view）

**类型**：no-view Command
**运行方式**：后台定时运行
**refreshInterval**：60s（MVP）

#### 职责（唯一职责）

* 判断当前是否锁屏
* 与上一次状态对比
* 若状态发生变化：

  * 计算时间差
  * 更新统计数据
  * 写入 LocalStorage

> ⚠️ 这是整个 Extension 的“心跳”

---

### 6.3 Command：Lock Time（Menu Bar）（Optional）

**类型**：Menu Bar Command

#### 菜单栏展示

* `🔒 18m today`

#### 展开内容

* Today Locked Time
* Last Unlock Interval
* Reset Today

---

## 7. 状态识别方案

### 7.1 方案选择

采用 **轮询 + Swift CGSessionCopyCurrentDictionary**（多级降级策略）

#### 检测方法（优先级从高到低）

1. **Swift + CGSessionCopyCurrentDictionary**（主方法）
   * 通过 `execSync("swift -")` 执行 Swift 脚本
   * 调用 CoreGraphics 的 `CGSessionCopyCurrentDictionary()` API
   * 直接读取 `CGSSessionScreenIsLocked` 布尔字段
   * 无需 Automation 权限，macOS 26+ 上最可靠

2. **AppleScript 前台进程检测**（备用方法）
   * 若 frontmost process ∈ `loginwindow` / `ScreenSaverEngine` → LOCKED
   * 需要 System Events Automation 权限

3. **间隙检测 / Gap Detection**（兜底方案）
   * 当两次轮询间隔 > 90 秒且前后都是 UNLOCKED
   * 推断期间发生了锁屏，将间隙记为锁屏时长
   * 主要应对某些 macOS 版本下后台任务暂停的情况

#### 判定频率

* 60 秒一次（由 Raycast `interval: "1m"` 控制）

#### 接受的误差

* 少量误判可接受
* 目标是**趋势可信，而非法医级精度**
* 锁屏时长精度取决于轮询间隔（最大误差 ±60 秒）

### 7.2 历史方案与教训

详见 [`docs/deep-dive/01-debug-lock-detection-macos26.md`](docs/deep-dive/01-debug-lock-detection-macos26.md)，记录了 4 种方案的完整探索过程：

* ❌ AppleScript 前台进程检测 — 间接推断，错误回退值不安全
* ❌ JXA + CGSession — macOS 26 的 ObjC bridge 无法正确桥接 CFDictionary
* ❌ 间隙检测（单独使用）— macOS 26 上后台 interval 锁屏期间不暂停
* ✅ Swift + CGSession — 原生桥接可靠，直接查询锁屏状态

---

## 8. 数据模型（LocalStorage）

```ts
{
  state: {
    current: "locked" | "unlocked",
    lastChangeAt: number // timestamp
  },
  metrics: {
    todayLockedMs: number,
    lastLockDurationMs: number,
    lastUnlockIntervalMs: number,
    todayDate: "YYYY-MM-DD"
  },
  history?: {
    events: Array<{
      type: "lock" | "unlock",
      at: number
    }>
  }
}
```

### 日期切换规则

* 每次 Update Lock State 运行时：

  * 若 `todayDate !== nowDate`

    * reset todayLockedMs
    * 更新 todayDate

---

## 9. 非功能性要求（NFR）

* CPU 占用：可忽略
* 内存：仅 LocalStorage
* 网络：**完全不使用**
* 权限：Swift CGSession 无需额外权限；AppleScript 备用方案需 Automation 权限
* 可卸载：卸载即删除所有数据

---

## 10. 错误与边界处理

| 场景             | 处理        |
| -------------- | --------- |
| Raycast 未运行    | 不记录（可接受）  |
| Mac 休眠         | 视为 LOCKED |
| 系统时间变更         | 忽略异常区间    |
| 检测方法失败    | 保持上一次状态   |
| macOS 版本差异  | Swift→AppleScript→Gap Detection 多级降级 |

---

## 11. MVP 验收标准（Acceptance Criteria）

* 连续使用 1 天后：

  * Today Locked Time ≠ 0
  * Last Unlock Interval 合理变化
* 锁屏 → 解锁 → 再锁屏

  * Last Lock Duration & Last Unlock Interval 都会更新
* 不需要任何手动操作即可生效

---

## 12. 实现优先级（给 Cursor 用）

**Phase 1（必须）**

1. Update Lock State 状态机
2. LocalStorage 数据结构
3. Lock Stats View

**Phase 2（加分）**
4. Menu Bar Command
5. Reset Actions
6. README + Store 描述

---

## 13. 一句话产品主张（可直接写 README）

> Lock Time quietly tracks how long your Mac stays locked—and how long you stay focused between unlocks.
