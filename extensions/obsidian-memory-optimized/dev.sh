#!/bin/bash

# 开发环境启动脚本，增加 Node.js 内存限制
# 默认设置 4GB 内存限制，可根据需要调整

echo "🚀 启动 Raycast Obsidian 扩展开发环境..."
echo "📝 Node.js 内存限制: 4096MB"
echo "📁 Obsidian 笔记库路径: $1"
echo ""

# 设置 Node.js 内存限制为 4GB
export NODE_OPTIONS="--max-old-space-size=4096"

# 如果提供了 vault 路径参数，设置环境变量
if [ ! -z "$1" ]; then
    export OBSIDIAN_VAULT_PATH="$1"
    echo "✅ 已设置 Obsidian vault 路径: $OBSIDIAN_VAULT_PATH"
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动开发服务器
echo ""
echo "🔧 启动开发服务器..."
npm run dev
