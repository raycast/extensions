# Notion i18n Export

Raycast扩展，用于从Notion导出i18n数据到Web和iOS格式。

## 安装方法

1. 克隆仓库到本地：
   ```bash
   git clone [仓库URL]
   ```

2. 进入扩展目录：
   ```bash
   cd [目录路径]/raycast/i18n-export
   ```

3. 安装依赖：
   ```bash
   pnpm install
   ```

4. 构建并安装扩展：
   ```bash
   pnpm run build
   ```

5. 重启Raycast应用。

## 配置说明

1. 在Raycast中按`⌘+,`打开设置。
2. 选择扩展标签页，找到"Notion i18n Export"扩展。
3. 配置以下参数：
   - **Notion API Key**：你的Notion API密钥（必填）
   - **Notion Database ID**：包含i18n数据的Notion数据库ID（必填）
   - **iOS Output Path**：用于iOS本地化文件的输出目录（可选）
   - **Web Output Path**：用于Web JSON文件的输出目录（可选）

## 使用方法

扩展提供三个命令：

- **Export iOS i18n**：导出iOS格式的本地化文件
  - 需要在全局设置中配置iOS输出路径，否则会提示错误

- **Export Web i18n**：导出Web格式的JSON文件
  - 需要在全局设置中配置Web输出路径，否则会提示错误

- **Export All i18n**：根据已配置的路径导出
  - 如果两个路径都已配置，则同时导出iOS和Web格式
  - 如果只配置了其中一个路径，则只导出该格式
  - 如果两个路径都未配置，则会提示错误

在Raycast中输入命令名称来执行相应操作。
