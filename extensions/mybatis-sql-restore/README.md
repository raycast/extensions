# mybatis-sql-restore

这是一个Raycast插件，用于将Mybatis日志中的SQL还原为真实SQL并格式化。

## 功能

- 解析Mybatis日志中的SQL语句和参数
- 将参数替换到SQL语句中
- 格式化SQL语句
- 将结果复制到剪贴板

## 使用方法

1. 复制包含Mybatis SQL日志的文本
2. 在Raycast中调用 "Format Mybatis SQL" 命令
3. 格式化后的SQL将自动复制到剪贴板

## 示例

### 输入

```
SELECT count(0) FROM task WHERE ((istatus = ? AND buz_partner = ? AND create_time >= ? AND create_time <= ?)) AND (task.id = 1001)
2025-07-16 22:05:04.176   [DEBUG] com.xx.xx.xx.xx.TxxService-36-thread-10 selectByExample_COUNT #XMDT#{__traceSample__=true __traceId__=traceiddemo __spanId__=0.10}#XMDT#  ==> Parameters: 1(Integer), 3(Integer), 2025-07-16 00:00:00.0(Timestamp), 2025-07-16 00:00:00.0(Timestamp)
```

### 输出

```sql
SELECT
  count(0)
FROM
  task
WHERE
  (
    (
      istatus = 1
      AND buz_partner = 3
      AND create_time >= '2025-07-16 00:00:00.0'
      AND create_time <= '2025-07-16 00:00:00.0'
    )
  )
  AND (task.id = 1001)
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 发布
npm run publish