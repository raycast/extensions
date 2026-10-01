# Improvement Notes

这里记录 Easydict 的改进提案、设计依据、取舍和验收条件。格式参考 [deepseek-harness Agent Notes](https://github.com/deepseek-ai/deepseek-harness/tree/master/.agents/notes)，正文使用中文，保留固定英文头部与章节名。

文档按 `{status}/{class}/yyyy-mm-dd-topic.md` 存放，日期表示首次提出时间，目录按需创建。`proposed` 表示尚未实施或仅部分实施，`implemented` 表示已经交付，`rejected` 表示不再推进。类别按实际内容选择，如 `architecture`、`simplification`、`bug-fix`、`feature`、`testing` 或 `process`。

提案以 `# Agent Note: <标题>` 开始，空一行后填写 `Status: proposed`。正文依次包含 `## Problem`、`## Proposal`、必要的技术章节、`## Alternatives considered`、`## Acceptance criteria` 和 `## Risks`。备选方案只记录实际考虑过的选择及其取舍；验收标准描述可检查的行为或产物。

大型改进可以保留一份路线图，维护共同约束、依赖顺序和各工作项链接；按可独立交付和验证的结果拆分提案，不按每个文件拆分。详细范围、进度与专项验收只在对应提案维护，调查文档保存证据和采用边界，避免多处重复跟踪。

跨批次的测试精简可以单独用 testing 提案记录证据与退役条件，由相关重构提案引用并同批执行。删除用例或断言时记录保留/替代覆盖，不能因目录搬迁或数量目标删除有效契约测试。

实施过程中更新对应提案的进度、验证结果和实际路径。完成后移到 `implemented`，状态改为 `Status: implemented`，将 `Proposal` 改为描述已交付事实的 `Decision`，把验收结果和风险归入 `Consequences` 或验证章节。拒绝的提案移到 `rejected`，状态填写 `Status: rejected — <原因>`。移动时更新路线图和其他引用；可选原型未采用不代表整体改进失败。

文档之间及源码引用使用相对 Markdown 链接，移动文件时同步修复。段落和单个列表项保持在一个物理行；代码块、表格保留结构换行。目录树本身作为文档清单。
