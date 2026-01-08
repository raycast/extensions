# 创建图标说明

## 使用 SVG 模板

项目中包含了一个 SVG 图标模板 (`assets/icon-template.svg`),您可以:

### 方式一: 在线转换 SVG 到 PNG

1. 访问 https://cloudconvert.com/svg-to-png
2. 上传 `assets/icon-template.svg`
3. 设置输出尺寸为 512x512
4. 下载转换后的 PNG 文件
5. 重命名为 `icon.png` 并放到 `assets/` 目录

### 方式二: 使用 ImageMagick (命令行)

如果您安装了 ImageMagick:

```bash
# 安装 ImageMagick (如果未安装)
brew install imagemagick

# 转换 SVG 到 PNG
cd assets
convert icon-template.svg -resize 512x512 icon.png
```

### 方式三: 使用 Inkscape (命令行)

如果您安装了 Inkscape:

```bash
# 安装 Inkscape (如果未安装)
brew install --cask inkscape

# 转换 SVG 到 PNG
cd assets
inkscape icon-template.svg --export-type=png --export-filename=icon.png -w 512 -h 512
```

### 方式四: 使用在线设计工具

1. 在 Figma/Sketch/Canva 中打开 SVG
2. 导出为 512x512 PNG
3. 保存为 `assets/icon.png`

### 方式五: 自定义设计

您也可以完全自定义设计图标:

1. 使用您喜欢的设计工具创建 512x512 的图标
2. 导出为 PNG 格式
3. 保存为 `assets/icon.png`

## 设计建议

- **颜色**: Node.js 的绿色 (#68A063, #3C873A) 是不错的选择
- **元素**: 可以包含 Node.js 标志、"fnm" 文字、速度符号(闪电等)
- **简洁**: 图标在小尺寸下也要清晰可辨
- **对比**: 确保在深色和浅色背景下都清晰可见

## 验证图标

创建图标后,在 Raycast 中运行 `npm run dev` 查看效果。
