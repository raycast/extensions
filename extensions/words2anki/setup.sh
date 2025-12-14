#!/bin/bash

# Raycast 扩展快速设置脚本

echo "🚀 Words to Anki - Raycast 扩展设置"
echo "=================================="
echo ""

# 检查项目文件
echo "✓ 检查项目文件..."
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 找不到 package.json"
    exit 1
fi

if [ ! -f "command-icon.png" ]; then
    echo "❌ 错误: 找不到 command-icon.png"
    exit 1
fi

if [ ! -f "src/ankicard.tsx" ]; then
    echo "❌ 错误: 找不到 src/ankicard.tsx"
    exit 1
fi

echo "✓ 所有必需文件都存在"
echo ""

# 显示导入说明
echo "📦 下一步: 在 Raycast 中导入扩展"
echo "=================================="
echo ""
echo "1. 打开 Raycast (按 Cmd + Space)"
echo "2. 输入: Import Extension"
echo "3. 选择此目录: $(pwd)"
echo "4. 等待 Raycast 安装依赖（可能需要几分钟）"
echo ""

# 显示配置说明
echo "⚙️  导入后配置 API Key"
echo "=================================="
echo ""
echo "方法 1（推荐）："
echo "  Raycast → Extensions → Words to Anki → 齿轮图标 ⚙️"
echo ""
echo "方法 2："
echo "  Raycast → Preferences (Cmd+,) → Extensions → Words to Anki"
echo ""
echo "方法 3："
echo "  直接运行 'ankicard' 命令，会提示输入 API Key"
echo ""

# 显示 DeepSeek API Key 获取方式
echo "🔑 获取 DeepSeek API Key"
echo "=================================="
echo ""
echo "1. 访问: https://platform.deepseek.com/"
echo "2. 注册/登录"
echo "3. 进入 API Keys 页面"
echo "4. 创建新密钥"
echo "5. 复制密钥 (格式: sk-...)"
echo ""

# 显示项目信息
echo "📊 项目信息"
echo "=================================="
echo "项目路径: $(pwd)"
echo "主命令: ankicard"
echo "配置文件: package.json"
echo ""

echo "✅ 准备就绪！按照上述步骤在 Raycast 中导入即可使用。"
