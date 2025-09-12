# Mybatis-Sql-Restore Changelog

## [Initial Version] - 2024-01-15

### ✨ 新功能

#### 核心功能
- **MyBatis 日志解析**: 智能解析 MyBatis 日志，自动提取 SQL 语句和参数
- **参数替换**: 自动将 SQL 中的占位符 `?` 替换为实际参数值
- **SQL 格式化**: 使用 `sql-formatter` 库对 SQL 进行美化格式化
- **多种输入方式**: 支持剪贴板读取和手动输入两种方式

#### 四个主要命令
1. **从剪贴板还原 MyBatis SQL** (`restore-mybatis-sql-from-clipboard`)
   - 自动读取剪贴板中的 MyBatis 日志
   - 解析并还原为可执行的 SQL 语句
   - 格式化后自动复制回剪贴板
   - 支持 Toast 通知显示结果

2. **从输入表单还原 MyBatis SQL** (`restore-mybatis-sql-from-inputForm`)
   - 提供可视化输入表单
   - 实时预览格式化结果
   - 支持详情页面查看完整 SQL
   - 一键复制功能

3. **直接格式化 SQL** (`format-sql`)
   - 直接格式化原始 SQL 语句
   - 无需 MyBatis 日志解析
   - 支持表单输入和详情查看
   - 语法高亮显示

4. **格式化剪贴板 SQL** (`format-clipboard-sql`)
   - 快速格式化剪贴板中的 SQL
   - 无需参数替换，纯格式化
   - 一键操作，高效便捷
