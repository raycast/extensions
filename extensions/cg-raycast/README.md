# CG Raycast Extension

一个用于快速查询加密货币数据的 Raycast 扩展。

## 功能特性

### 🔍 Market Info - 市场信息

- 查看实时币价和24小时涨跌幅
- 显示持仓量和成交量数据
- 点击查看详细信息，包括各交易所数据
- 支持多个交易所的数据对比

### 📊 Open Interest - 持仓量

- 查看各币种的持仓量数据
- 显示各交易所的持仓分布
- 包含价格、成交量和多空比信息

### 📊 Exchange Info - 交易所信息

- 查看各交易所的交易数据
- 查看交易所评分

## 安装说明

1. 确保你有 Raycast 应用
2. 在项目目录运行：
   ```bash
   npm install
   npm run build
   ```
3. 在 Raycast 中导入该扩展

## 使用说明

1. 在 Raycast 中输入相应的命令：
    - `Market Info` - 市场信息
    - `Exchange Info` - 查看交易所信息
    - `Open Interest` - 查看持仓量

2. 使用搜索功能快速找到你关心的币种

3. 点击项目查看详细信息

## 技术栈

- React + TypeScript
- Raycast API