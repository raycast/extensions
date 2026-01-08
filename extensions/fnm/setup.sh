#!/bin/bash

# FNM Raycast 扩展 - 快速安装脚本
# 此脚本将帮助您快速设置和运行扩展

set -e

echo "🚀 FNM Raycast 扩展 - 快速安装"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 fnm 是否安装
echo "📋 步骤 1/4: 检查 fnm 安装..."
if ! command -v fnm &> /dev/null; then
    echo -e "${YELLOW}⚠️  fnm 未安装${NC}"
    echo ""
    echo "请先安装 fnm:"
    echo "  brew install fnm"
    echo ""
    echo "然后配置 shell:"
    echo "  echo 'eval \"\$(fnm env --use-on-cd)\"' >> ~/.zshrc"
    echo "  source ~/.zshrc"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ fnm 已安装: $(fnm --version)${NC}"
fi

# 检查图标
echo ""
echo "🎨 步骤 2/4: 检查图标文件..."
if [ ! -f "assets/icon.png" ]; then
    echo -e "${YELLOW}⚠️  图标文件不存在${NC}"
    echo ""
    echo "您需要创建 assets/icon.png (512x512 像素)"
    echo ""
    echo "推荐方式:"
    echo "  1. 访问 https://cloudconvert.com/svg-to-png"
    echo "  2. 上传 assets/icon-template.svg"
    echo "  3. 设置尺寸为 512x512"
    echo "  4. 下载并重命名为 icon.png"
    echo "  5. 放到 assets/ 目录"
    echo ""
    echo "或使用 ImageMagick:"
    echo "  brew install imagemagick"
    echo "  cd assets"
    echo "  convert icon-template.svg -resize 512x512 icon.png"
    echo ""
    read -p "是否继续(图标稍后创建)? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ 图标文件已存在${NC}"
fi

# 安装依赖
echo ""
echo "📦 步骤 3/4: 安装依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在运行 npm install..."
    npm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
fi

# 启动开发模式
echo ""
echo "🎯 步骤 4/4: 启动开发模式"
echo ""
echo -e "${BLUE}即将启动 Raycast 开发模式...${NC}"
echo ""
echo "启动后:"
echo "  1. 打开 Raycast (⌘ + Space)"
echo "  2. 搜索以下命令:"
echo "     - List Node.js Versions"
echo "     - Install Node.js Version"
echo "     - Use Node.js Version"
echo "     - Uninstall Node.js Version"
echo ""
echo "快捷键:"
echo "  ⌘ + R : 刷新列表"
echo "  ⌘ + D : 设置为默认版本"
echo ""

read -p "按 Enter 键启动开发模式..." 

echo ""
echo -e "${GREEN}🚀 启动中...${NC}"
echo ""

npm run dev
