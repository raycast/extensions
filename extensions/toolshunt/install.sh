#!/bin/bash

# ToolsHunt Raycast Extension 安装脚本
# 使用方法: ./install.sh

set -e

echo "🚀 ToolsHunt Raycast Extension 安装脚本"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 raycast-extension 目录下运行此脚本"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    echo "   访问: https://nodejs.org/"
    exit 1
fi

echo "✅ 检测到 Node.js 版本: $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm"
    exit 1
fi

echo "✅ 检测到 npm 版本: $(npm -v)"

# 检查 Raycast
if ! command -v open &> /dev/null; then
    echo "⚠️  警告: 无法检测 Raycast 是否已安装"
else
    if [ -d "/Applications/Raycast.app" ]; then
        echo "✅ 检测到 Raycast 已安装"
    else
        echo "⚠️  警告: 未检测到 Raycast，请先安装 Raycast"
        echo "   访问: https://raycast.com/"
    fi
fi

# 检查 ToolsHunt 应用
echo ""
echo "🔍 检查 ToolsHunt 应用..."
if [ -d "/Applications/ToolsHunt.app" ]; then
    echo "✅ 找到 ToolsHunt 应用"
    TOOLSHUNT_VERSION=$(defaults read /Applications/ToolsHunt.app/Contents/Info.plist CFBundleShortVersionString 2>/dev/null || echo "unknown")
    echo "   版本: $TOOLSHUNT_VERSION"
else
    echo "⚠️  警告: 未找到 ToolsHunt 应用在 /Applications 目录"
    echo "   如果已安装在其他位置，插件会自动搜索"
fi

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 检查是否安装成功
if [ $? -eq 0 ]; then
    echo "✅ 依赖安装完成"
else
    echo "❌ 依赖安装失败"
    exit 1
fi

# 生成命令文件（如果需要）
if [ -f "scripts/generate-commands.js" ]; then
    echo ""
    echo "⚙️  生成命令文件..."
    node scripts/generate-commands.js
    echo "✅ 命令文件生成完成"
fi

# 检查图标
echo ""
echo "🎨 检查图标文件..."
if [ -f "command-icon.png" ]; then
    echo "✅ 图标文件已存在"
else
    echo "⚠️  警告: 未找到图标文件"
    if [ -f "../build/logo_icon.png" ]; then
        echo "   正在从主项目复制图标..."
        cp ../build/logo_icon.png command-icon.png
        echo "✅ 图标已复制"
    else
        echo "   将使用默认图标"
    fi
fi

# 提供启动选项
echo ""
echo "=========================================="
echo "✨ 安装完成！"
echo ""
echo "接下来可以："
echo ""
echo "1️⃣  在开发模式运行 Raycast 插件:"
echo "   npm run dev"
echo ""
echo "2️⃣  测试深链接功能（需要先重新构建 ToolsHunt 应用）:"
echo "   cd .."
echo "   npm run dist:mac-arm64  # 或 dist:mac-x64"
echo "   open 'toolshunt://tool/json-formatter'"
echo ""
echo "3️⃣  查看文档:"
echo "   cat README.zh-CN.md"
echo "   cat QUICK_START.md"
echo ""
echo "=========================================="
echo ""

# 询问是否立即启动开发模式
read -p "是否立即启动开发模式? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 启动开发模式..."
    npm run dev
fi

