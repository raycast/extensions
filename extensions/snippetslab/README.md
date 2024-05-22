<div align="center">
  <h1>SnippetsLab-Raycast</h1>
  <h3>适用于SnippetsLab的Raycast插件</h3>
</div>

# 软件版本要求
- SnippetsLab 2.3.2
- Raycast 1.59.0

# 如何配置
1. `git clone git@github.com:LetTTGACO/SnippetsLab-Raycast.git` 到本地文件夹
2. 将仓库根目录的 SnippetsLabAlfredWorkflow 文件拷贝到 /Applications/SnippetsLab.app/Contents/SharedSupport/Integrations 目录下
3. 运行`npm run build`
4. Raycast Import Extension 导入，选择此步骤1中的文件夹即可

> SnippetsLabAlfredWorkflow 文件也可以从SnippetsLab设置中安装到Alfred获取，在Alfred的Workflow找到并从访达中打开，也能找到此文件


# 原理
用 `execa` + `child_process`运行本来运行在Alfred中的 SnippetsLabAlfredWorkflow 可执行文件

