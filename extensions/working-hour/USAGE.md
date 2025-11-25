# 使用指南

## 快速开始

### 1. 获取必要信息

在配置插件之前，你需要准备以下信息：

#### 手机号和密码
- iTalent 登录手机号
- iTalent 登录密码（明文即可）

#### 用户信息和 UID

1. 登录 [iTalent 网页版](https://www.italent.cn/)
2. 登录成功后，查看浏览器地址栏
3. 地址栏示例：`https://www.italent.cn/portal/iTalentHome?xpuid=161534441&...`
4. 记录以下信息：
   - **UID**: 地址栏中的 `xpuid` 参数值（如：`161534441`）
   - **用户信息**: 你的姓名和邮箱，格式为 `姓名(邮箱)`（如：`张三(zhangsan@company.com)`）

### 2. 配置插件

1. 在 Raycast 中打开插件设置（快捷键：`⌘ ,`）
2. 找到 "Working Hour" 插件
3. 填写以下信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| 手机号 | iTalent 登录手机号 | `13800138000` |
| 登录密码 | iTalent 登录密码（明文） | `your_password` |
| 用户信息 | 格式：姓名(邮箱) | `张三(zhangsan@company.com)` |
| 用户 UID | 网页版地址栏中的 xpuid 值 | `161534441` |
| 目标工时 | 每天目标工作时长（可选） | `9.5` |

### 3. 使用插件

配置完成后，你可以使用以下两个命令：

#### 快速查看工时

- 在 Raycast 中输入：`快速查看工时` 或 `Working Hour`
- 会在 HUD 中快速显示工时统计信息
- 适合快速查看当前工时情况

#### 查看工时详情

- 在 Raycast 中输入：`查看工时详情`
- 会打开详细视图，显示完整的工时统计
- 支持刷新功能
- 显示内容包括：
  - 考勤周期
  - 平均工时
  - 目标工时
  - 差异统计
  - 迟到次数

## 常见问题

### Q: 密码安全吗？

A: 是的，密码安全性有保障：
- 密码仅在本地使用 RSA 公钥加密
- 加密后的密码用于登录 iTalent 服务器
- 密码不会上传到任何第三方服务器
- 密码存储在 Raycast 的安全存储中

### Q: Cookie 是如何管理的？

A: 插件会自动管理 Cookie：
- 首次登录后，Cookie 会缓存在本地
- 后续请求会使用缓存的 Cookie
- 如果 Cookie 过期，会自动重新登录
- 你无需手动管理 Cookie

### Q: 考勤周期是如何计算的？

A: 考勤周期规则：
- 每月 26 日到次月 25 日为一个考勤周期
- 例如：2025/01/26 - 2025/02/25

### Q: 为什么当天的工时没有计入平均值？

A: 如果当天工时小于 8.5 小时，会被视为未完成，暂不计入平均值。这是为了避免影响统计准确性。

### Q: 如何判断是否迟到？

A: 迟到判断规则：
- 首次打卡时间晚于 10:00 AM 视为迟到
- 统计会显示当前周期的迟到次数

### Q: 登录失败怎么办？

A: 请检查以下几点：
1. 手机号和密码是否正确
2. 网络连接是否正常
3. iTalent 服务是否正常
4. 尝试在网页版登录验证账号密码

### Q: 如何更新配置？

A: 在 Raycast 中：
1. 打开插件设置（`⌘ ,`）
2. 找到 "Working Hour" 插件
3. 修改相应的配置项
4. 保存后，下次使用会自动应用新配置

## 技术说明

### 密码加密

插件使用 iTalent 官方的 RSA 公钥对密码进行加密：

```
-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCCAGUAYFFTqlMwndAkJbO6GoOi
PTPMreeYJ6JfWbx5rliI4PevlmMZNISOtmZm6Sv44wlA4l+1y1wqAE31jPhH2bZ2
qqbJdiPB7VXpR5nQeSZGcNCSCK7N62A5b8ssEjbWd5jMBiqD/erLkc87/jQ0iqd3
42Oixc9y4LFn//ABWwIDAQAB
-----END PUBLIC KEY-----
```

加密过程：
1. 使用 Node.js crypto 模块
2. 采用 RSA_PKCS1_PADDING 填充方式
3. 输出 Base64 编码的加密字符串

### 数据存储

- **Cookie**: 存储在 Raycast LocalStorage 中
- **配置**: 存储在 Raycast Preferences 中
- **密码**: 仅在内存中加密，不会持久化明文密码

## 反馈与支持

如果遇到问题或有建议，请联系开发者或提交 Issue。

