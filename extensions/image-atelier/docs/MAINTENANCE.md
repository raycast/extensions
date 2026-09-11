# Image Atelier 发布与维护

## 用户需要提供的材料

- Raycast 和 GitHub 用户名均已确认为 mikeboly；package.json 的 author 已更新。
- GitHub 账户，发布时亲自在浏览器完成官方 CLI 的授权。无需提供密码或访问令牌。
- 服务商、Base URL、密钥和模型均由安装用户自行配置，不内置服务商或模型默认值。真实生成、编辑和聊天工具测试仍需测试人员自行配置 API；不会将测试配置打包发布。
- 真实 Raycast 窗口截图。建议模型选择、生成表单、图片结果各一张；使用 Raycast Window Capture，勾选 Save to Metadata。官方规格为 PNG、2000 × 1250，最多六张，建议至少三张。不得展示密钥或私人数据。

## 当前状态

- 已有英文 README、中文说明、MIT License、512 × 512 PNG 图标和初版 CHANGELOG。
- 已配置 npm run check、check:store、publish、pull-contributions。
- 模型发现保留为生成命令的子页面；地址、密钥和保存位置使用原生 Preferences。移除了独立 Configure 命令，以符合 Store 的设置界面指导。
- 用户已确认真实 API 可以正常生成；编辑和完整界面回归尚未确认。模拟测试不代表所有提供商兼容认证。
- 本地 Git 仓库已初始化；类型检查、ESLint、格式检查、5 项模拟测试和分发构建通过。
- 首次提交不附概念图作为截图。真实 Store 截图与其余人工验收可根据评审意见补充。
- 本文件不是已发布证明；发布状态以官方 PR 为准。

## 本地检查

```sh
npm ci
npm run check
npm run check:store
```

check 包含类型、ESLint、格式和模拟 HTTP 测试。check:store 额外执行 Raycast 在线 manifest/作者/图标校验与 distribution build；无有效 author 时会失败。Raycast build 默认写入本机扩展目录。

## 真实验收记录

发布前记录提供商、模型、日期、macOS/Raycast 版本和以下操作的结果；不要记录密钥。

- 模型列表加载；手动输入；更换 API 后重新选择。
- 文本生成；参考图编辑；AI Chat 中生成和连续编辑。
- 默认目录、自定义目录；打开图片、Finder、复制、另存为；同名保护。
- 错误密钥、无模型、无效图片、服务不支持模型列表时的提示。
- 浅色和深色主题下的可读性；分发构建下正常使用。

模型列表只能证明发现了模型，不能证明它支持 Images API。某个服务商实测通过后再写入兼容说明，注明其模型与协议。

## 首次提交

通过作者校验和验收后，准备本地 Git 仓库与提交，然后运行：

```sh
npm run publish
```

该命令会启动 GitHub 授权并向 raycast/extensions 创建或更新 PR，不是发布 npm 包。不要使用 npm publish。官方评审并合并后自动上线 Store。提交前查看待公开的代码、README、截图和 PR 描述。当前尚未运行发布命令。

## 后续版本

1. 先同步官方仓库的贡献：在关联的 Git 仓库运行 npm run pull-contributions。如遇冲突，保留双方有效改动并重新测试。
2. 复现问题再修改。协议变化修改 src/lib/images.ts；模型识别修改 src/lib/models.ts；保存行为修改 src/lib/save-copy.ts。
3. 增加能覆盖问题的测试，更新 README 和 CHANGELOG。新日志使用 `## [Update title] - {PR_MERGE_DATE}`。
4. 运行 npm run check:store，再完成与改动相关的真实回归。
5. 再次 npm run publish 提交更新；根据评审意见修复。若线上回归，回退问题改动并以修复 PR 发布，不删除用户文件或设置。

默认模型是运行时发现的，不必为每个新模型发版。新协议、接口字段变化或识别缺漏可能需要更新代码。依赖更新先用 npm outdated 查看，逐项升级后测试，避免无验证的批量升级。

可将复现信息或官方 review 链接交给助手处理；登录和真实窗口验收仍由用户配合。当前没有配置后台定时监控或自动发布。

## 官方依据

- [发布准备要求](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [发布、同步贡献和 PR 流程](https://developers.raycast.com/basics/publish-an-extension)
- [扩展准则](https://manual.raycast.com/extensions-guidelines)
