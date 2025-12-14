#!/bin/bash

# Raycast 扩展开发模式启动脚本

echo "🚀 启动 Words to Anki Raycast 扩展（开发模式）"
echo "================================================"
echo ""
echo "📌 说明："
echo "  - 开发模式下，Raycast 会自动编译 TypeScript"
echo "  - 保持此终端窗口开启，扩展将持续可用"
echo "  - 修改代码后会自动重新加载"
echo "  - 按 Ctrl+C 停止开发服务器"
echo ""
echo "================================================"
echo ""

# 切换到项目目录
cd "$(dirname "$0")"

# 确认目录
echo "📁 项目目录: $(pwd)"
echo ""

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "⚠️  依赖未安装，正在安装..."
    /opt/homebrew/bin/npm install
    echo ""
fi

# 启动开发服务器
echo "🔨 启动 Raycast 开发服务器..."
echo ""

/opt/homebrew/bin/npx @raycast/api@latest dev
