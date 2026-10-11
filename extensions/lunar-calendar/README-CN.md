[English README](README.md)
# 农历月历 (Lunar Calendar)

一个优雅、原生的 Raycast 农历与节假日查看扩展，专为 Mac 用户打造。无需打开繁琐的网页或系统日历，随时随地在 Raycast 中快速查阅农历、二十四节气、法定节假日调休安排及传统节日。

![Image](images/img1.png)

## 💡 功能亮点

- 📅 **完整月历视图**：开箱即用的 SVG 渲染图，完美契合 Raycast 界面风格，直观展示当月整体日历结构。
- 🏮 **农历与节气**：自动计算农历日期（初一至三十）、天干地支月份，并标注二十四节气（秋分、白露等）。
- 🚩 **法定节假日与调休**：同步最新法定节假日安排，清晰标注 **“休”**（红色背景）与 **“班”**（调休补班）标记。
- 🎉 **传统与公历节日**：精选除夕、春节、中秋等传统节日及元旦、国庆等主要公历节日。

## ⌨️ 快捷键说明

在插件视图中，你可以使用以下快捷键快速进行切换：

| 快捷键 | 功能 |
| :--- | :--- |
| `Cmd` + `→` | 切换至 **下一月** |
| `Cmd` + `←` | 切换至 **上一月** |
| `Cmd` + `T` | 快速返回 **今天** |

## 🛠️ 本地开发与构建

如果你想在本地进行修改、调试或参与开发，请参照以下步骤安装依赖并运行：

### 前置条件

- **Node.js**：建议使用 `v18.0.0` 或更高版本
- **npm**：随 Node.js 一起安装的包管理器
- **Raycast App**：Mac 必须已安装 Raycast

### 安装步骤与运行

**1. Clone 本仓库到本地**
```bash
git clone [https://github.com/bpktnmbwrp/lunar-calendar.git](https://github.com/bpktnmbwrp/lunar-calendar.git)
cd lunar-calendar
```

**2. 安装项目依赖**
```bash
npm install
```

**3. 启动 Raycast 本地开发模式**
```bash
npm run dev
```
*启动后打开 Raycast 输入框，搜索 `Lunar Calendar` 即可进行实时预览与热更新调试。*

**4. 代码规范与格式化校验**
在提交代码或发布前，请运行以下脚本进行格式化与 ESLint 语法检查：
```bash
npm run fix-lint
```

**5. 打包与构建**
```bash
npm run build
```

## 📄 开源协议

[MIT](LICENSE) © bpktnmbwrp