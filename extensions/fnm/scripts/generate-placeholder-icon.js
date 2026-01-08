#!/usr/bin/env node

/**
 * 生成一个简单的占位符图标
 * 这个脚本创建一个带有 "fnm" 文字的简单 PNG 图标
 * 
 * 注意: 这需要安装 canvas 包
 * npm install canvas --save-dev
 * 
 * 或者您可以使用在线工具或设计软件创建更好的图标
 */

console.log(`
╔════════════════════════════════════════════════════════════╗
║                   图标占位符生成器                          ║
╚════════════════════════════════════════════════════════════╝

此脚本需要 'canvas' 包来生成图标。

由于 canvas 包较大且依赖系统库,建议使用以下方式之一创建图标:

方式 1: 使用在线 SVG 转 PNG 工具
  1. 访问 https://cloudconvert.com/svg-to-png
  2. 上传 assets/icon-template.svg
  3. 设置尺寸为 512x512
  4. 下载并重命名为 icon.png

方式 2: 使用 ImageMagick (命令行)
  brew install imagemagick
  cd assets
  convert icon-template.svg -resize 512x512 icon.png

方式 3: 使用任意 512x512 PNG 图片作为临时占位符
  将图片重命名为 icon.png 并放到 assets/ 目录

方式 4: 使用设计工具
  在 Figma/Sketch/Canva 等工具中设计并导出

════════════════════════════════════════════════════════════

如果您确实想使用此脚本,请运行:
  npm install canvas --save-dev
  node scripts/generate-placeholder-icon.js --force

`);

// 检查是否强制运行
if (process.argv.includes('--force')) {
  try {
    const { createCanvas } = require('canvas');
    const fs = require('fs');
    const path = require('path');

    // 创建 512x512 画布
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext('2d');

    // 背景 - Node.js 绿色
    ctx.fillStyle = '#68A063';
    ctx.fillRect(0, 0, 512, 512);

    // 圆角效果(简化版)
    ctx.fillStyle = '#3C873A';
    ctx.beginPath();
    ctx.arc(256, 256, 180, 0, Math.PI * 2);
    ctx.fill();

    // 文字 "fnm"
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('fnm', 256, 256);

    // 保存图标
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(iconPath, buffer);

    console.log('✅ 图标已生成: assets/icon.png');
    console.log('💡 提示: 这是一个简单的占位符,建议使用专业设计工具创建更好的图标\n');
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.log('\n请先安装 canvas 包: npm install canvas --save-dev\n');
  }
}
