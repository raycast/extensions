# Working Hour - Raycast 插件

一个用于查询和统计 iTalent 平台工作时长的 Raycast 插件。

## 功能特性

- 📊 查看当前考勤周期的工时统计
- 🕓 显示平均工作时长
- 📈 计算与目标工时的差异
- ⏰ 统计迟到次数
- 🔄 自动管理登录状态和 Cookie

## 安装配置

### 1. 安装插件

在 Raycast 中导入此插件，或使用开发模式运行：

```bash
npm install
npm run dev
```

### 2. 配置参数

首次使用需要在 Raycast 的插件设置中配置以下参数：

#### 必填参数

- **手机号**: iTalent 登录手机号
- **登录密码**: iTalent 登录密码（明文即可，插件会自动使用 RSA 加密）
- **用户信息**: 格式为 `姓名(邮箱)`，例如：`张三(zhangsan@company.com)`
- **用户 UID**: 登录网页版后，地址栏中的 `xpuid` 参数值

#### 可选参数

- **目标工时**: 每天的目标工作时长（小时），默认 9.5

### 3. 获取用户信息和 UID

1. 登录 [iTalent 网页版](https://www.italent.cn/)
2. 进入首页后，查看浏览器地址栏
3. 地址栏中的 `xpuid` 参数值即为用户 UID
4. 用户信息格式为：`姓名(邮箱)`

## 使用方法

### 快速查看工时

使用 `快速查看工时` 命令，会在 HUD 中快速显示工时统计信息。

### 查看工时详情

使用 `查看工时详情` 命令，会打开详细视图，显示：
- 考勤周期
- 平均工时
- 目标工时
- 差异统计
- 迟到次数

## 项目结构

```
src/
├── login.ts                  # 快速查看命令
├── get-working-hour.tsx      # 详情查看命令
├── services/
│   └── api.ts                # API 服务层
├── utils/
│   └── index.ts              # 工具函数
└── types/
    └── index.ts              # TypeScript 类型定义
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 代码检查
npm run lint

# 自动修复
npm run fix-lint
```

## 注意事项

1. 密码会在插件内部自动使用 RSA 公钥加密，无需手动加密
2. Cookie 会自动缓存，过期后会自动重新登录
3. 考勤周期为每月 26 日至次月 25 日
4. 当天工时小于 8.5 小时时不计入平均值
5. 密码仅在本地加密，不会上传到任何服务器

## License

MIT