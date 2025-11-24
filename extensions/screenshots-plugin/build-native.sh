#!/bin/bash
# Build native floating window and mouse position applications
# 编译原生悬浮窗口和鼠标位置应用

set -e  # Exit on error

echo "🔨 Building native binaries..."
echo "🔨 正在编译原生二进制文件..."
echo ""

# Check if source files exist
if [ ! -f "FloatWindow.m" ]; then
    echo "❌ Error: FloatWindow.m not found"
    echo "❌ 错误：找不到 FloatWindow.m"
    exit 1
fi

if [ ! -f "get_mouse_position.m" ]; then
    echo "❌ Error: get_mouse_position.m not found"
    echo "❌ 错误：找不到 get_mouse_position.m"
    exit 1
fi

# Build float-window
echo "📦 Compiling float-window..."
echo "📦 正在编译 float-window..."

clang -framework Cocoa -framework Carbon -framework Vision -framework QuartzCore -framework ImageIO -o float-window FloatWindow.m

if [ $? -eq 0 ]; then
    chmod +x float-window
    echo "✅ float-window compiled successfully!"
    echo "✅ float-window 编译成功！"
    echo ""
else
    echo "❌ float-window compilation failed!"
    echo "❌ float-window 编译失败！"
    exit 1
fi

# Build get_mouse_position
echo "📦 Compiling get_mouse_position..."
echo "📦 正在编译 get_mouse_position..."

clang -framework Cocoa -o get_mouse_position get_mouse_position.m

if [ $? -eq 0 ]; then
    chmod +x get_mouse_position
    echo "✅ get_mouse_position compiled successfully!"
    echo "✅ get_mouse_position 编译成功！"
    echo ""
else
    echo "❌ get_mouse_position compilation failed!"
    echo "❌ get_mouse_position 编译失败！"
    exit 1
fi

# Verify binaries
echo "🔍 Verifying binaries..."
echo "🔍 正在验证二进制文件..."

if [ -x "float-window" ] && [ -x "get_mouse_position" ]; then
    echo "✅ All binaries are ready!"
    echo "✅ 所有二进制文件已就绪！"
    echo ""
    echo "📊 Binary sizes:"
    echo "📊 二进制文件大小："
    ls -lh float-window get_mouse_position | awk '{print "   " $9 ": " $5}'
else
    echo "❌ Binary verification failed!"
    echo "❌ 二进制文件验证失败！"
    exit 1
fi

echo ""
echo "🎉 Build completed successfully!"
echo "🎉 构建完成！"