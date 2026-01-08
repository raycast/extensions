#!/usr/bin/env node

/**
 * 使用 sharp 库创建图标
 * 运行: npm install sharp --save-dev && node scripts/create-icon.js
 */

const fs = require('fs');
const path = require('path');

async function createIcon() {
  try {
    const sharp = require('sharp');
    
    // 创建一个 512x512 的 SVG
    const svg = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <!-- 背景 -->
        <rect width="512" height="512" rx="128" fill="#68A063"/>
        
        <!-- Node.js 风格的六边形 -->
        <path d="M 256 140 L 340 190 L 340 290 L 256 340 L 172 290 L 172 190 Z" 
              fill="#3C873A" stroke="#FFFFFF" stroke-width="6"/>
        
        <!-- 闪电符号(代表"快速") -->
        <path d="M 275 200 L 245 250 L 270 250 L 240 310 L 280 250 L 255 250 Z" 
              fill="#FFD700" stroke="#FFFFFF" stroke-width="3"/>
        
        <!-- 文字 "fnm" -->
        <text x="256" y="420" 
              font-family="Arial, Helvetica, sans-serif" 
              font-size="72" 
              font-weight="bold" 
              fill="#FFFFFF" 
              text-anchor="middle">fnm</text>
      </svg>
    `;
    
    const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
    
    // 将 SVG 转换为 PNG
    await sharp(Buffer.from(svg))
      .resize(512, 512)
      .png()
      .toFile(iconPath);
    
    console.log('✅ 图标创建成功: assets/icon.png');
    console.log('📏 尺寸: 512x512 像素');
    console.log('🎨 格式: PNG');
    console.log('\n现在可以运行: npm run dev');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ 需要安装 sharp 库');
      console.log('\n请运行: npm install sharp --save-dev');
      console.log('然后再次运行: node scripts/create-icon.js');
    } else {
      console.error('❌ 创建图标时出错:', error.message);
    }
    process.exit(1);
  }
}

createIcon();
