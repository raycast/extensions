// Only authored UI messages are localized; event data, user content and JSON fields stay unchanged.
const english: Record<string, string> = {
  "、": ", ",
  "；": "; ",
  "，": ", ",
  发生未知错误: "Unknown error",
  网址无效: "Invalid URL",
  请填写标题: "Enter a title",
  请至少选择一个分类位置: "Select at least one category location",
  "如需移出所有分类，请使用“移入回收站”":
    "To remove all categories, move the bookmark to Trash",
  已更新书签: "Bookmark updated",
  已新增书签: "Bookmark added",
  未写入: "Not saved",
  所选字段没有可发送的内容: "The selected fields have no content to send",
  "AI 配置无效": "Invalid AI configuration",
  "发送所选字段到 AI 服务？": "Send selected fields to the AI service?",
  "协议：": "Protocol: ",
  "服务：": "Service: ",
  "模型：": "Model: ",
  未配置: "Not configured",
  "发送字段：": "Fields sent: ",
  "不会发送分类位置、访问统计或目录路径。API Key 仅作为认证头发送至上述服务，不进入提示词、书签库或导出；建议需你确认才填入表单。":
    "Category locations, visit counts, and directory paths are not sent. The API key is sent only as an authentication header to the service above; it is never included in prompts, the library, or exports. Suggestions require your approval before filling the form.",
  发送: "Send",
  "正在请求 AI 建议": "Requesting AI suggestions",
  取消: "Cancel",
  未获得建议: "No suggestions received",
  编辑书签: "Edit Bookmark",
  新增书签: "Add Bookmark",
  保存修改: "Save Changes",
  "AI 建议（BYOK）": "AI Suggestions (BYOK)",
  网址: "URL",
  "只接受 http(s)；{name} 为模板参数，打开时逐项填写":
    "Only http(s) URLs are accepted; {name} is a template parameter filled in when opening",
  标题: "Title",
  描述: "Description",
  标签: "Tags",
  多个标签用逗号分隔: "Separate tags with commas",
  分类位置: "Category Locations",
  "此书签位于回收站；恢复后才可修改分类位置。":
    "This bookmark is in Trash; restore it before editing category locations.",
  "分类位置（可多选）": "Category Locations (multiple)",
  收藏: "Favorite",
  "加入 Favorites（置顶）": "Add to Favorites (pin)",
  万能匹配: "Universal Match",
  本地搜索无结果时作为回退候选:
    "Use as a fallback when local search has no results",
  "AI 隐私": "AI Privacy",
  "只有下面勾选的字段会在你主动触发时发送给所选协议的服务；建议不会自动保存。":
    "Only selected fields are sent to the chosen service when you request it; suggestions are not saved automatically.",
  "AI 发送字段": "Fields to Send to AI",
  "AI 建议（尚未应用）": "AI Suggestions (not applied)",
  填入表单: "Fill Form",
  返回表单: "Back to Form",
  服务: "Service",
  当前标题: "Current Title",
  "（空）": "(empty)",
  建议标题: "Suggested Title",
  "（不修改）": "(unchanged)",
  当前描述: "Current Description",
  建议描述: "Suggested Description",
  当前标签: "Current Tags",
  建议标签: "Suggested Tags",
  说明: "Note",
  "以上内容按纯文本展示。填入表单不会保存，仍需你提交表单。":
    "Shown as plain text. Filling the form does not save; you still need to submit it.",
  "存在未解决冲突，本次只读": "Unresolved conflicts; read-only for now",
  请在设置与数据中解决冲突后才能写入:
    "Resolve conflicts in Settings & Data before writing",
  "共享 JSON 同步已暂停：": "Shared JSON sync paused: ",
  无法打开: "Unable to open",
  无法打开链接: "Unable to open link",
  "已打开并记录访问，请注意": "Opened and recorded visit; attention needed",
  "已打开，但未能记录访问": "Opened, but could not record visit",
  "# 无法读取本地库\n\n": "# Cannot Read Local Library\n\n",
  "\n\n请确认数据目录存在且为专用目录（空或仅含 `events`），或在扩展设置中修改数据目录。切换目录不会搬迁或删除旧库。":
    "\n\nEnsure the data directory exists and is dedicated (empty or containing only `events`), or change it in extension preferences. Changing directories does not move or delete the old library.",
  重新加载: "Reload",
  打开扩展设置: "Open Extension Preferences",
  设置与数据: "Settings & Data",
  正在读取本地库: "Reading Local Library",
  "# 本地库已暂停写入\n\n检测到不可读或不安全的数据，不会以空库覆盖本地文件，也不会展示未经校验的数据。\n\n":
    "# Local Library Is Read-Only\n\nUnreadable or unsafe data was detected. Local files will not be overwritten with an empty library, and unverified data will not be shown.\n\n",
  "\n\n数据目录：`": "\n\nData directory: `",
  填写参数并打开: "Fill Parameters and Open",
  打开: "Open",
  "复制 URL": "Copy URL",
  编辑: "Edit",
  管理分类位置: "Manage Category Locations",
  取消收藏: "Remove from Favorites",
  加入收藏: "Add to Favorites",
  已取消收藏: "Removed from Favorites",
  已加入收藏: "Added to Favorites",
  恢复: "Restore",
  已恢复: "Restored",
  移入回收站: "Move to Trash",
  "移入回收站？": "Move to Trash?",
  " 将移入回收站，之后可恢复。":
    " will be moved to Trash and can be restored later.",
  已移入回收站: "Moved to Trash",
  "解决冲突…": "Resolve Conflicts…",
  刷新图标: "Refresh Icon",
  已刷新图标: "Icon refreshed",
  刷新图标失败: "Failed to refresh icon",
  "搜索标题、网址、描述或标签": "Search titles, URLs, descriptions, or tags",
  筛选范围: "Filter Scope",
  全部: "All",
  最近使用: "Recently Used",
  回收站: "Trash",
  万能匹配回退: "Universal Match Fallback",
  没有匹配的书签: "No matching bookmarks",
  回收站为空: "Trash is empty",
  还没有书签: "No bookmarks yet",
  "本地未匹配到结果，也不会注册任何全局搜索入口":
    "No local results; no global search entry is registered",
  在下方新增第一个书签: "Add your first bookmark below",
  保存此链接: "Save This Link",
  "AI 保存此链接": "Save This Link with AI",
  "AI 不可用，已降级为普通保存": "AI unavailable; saved normally instead",
  "打开：": "Open: ",
  模板: "Template",
  "参数值（会做 URL 编码）": "Parameter value (URL-encoded)",
  保存位置: "Save Locations",
  至少保留一个分类位置: "Keep at least one category location",
  已更新分类位置: "Category locations updated",
  书签: "Bookmark",
  选择或搜索分类: "Select or search categories",
  无法删除分类: "Cannot delete category",
  删除: "Delete",
  子分类: "subcategory",
  一级分类: "top-level category",
  "受影响的 ": "The affected ",
  " 个书签将": " bookmarks will be ",
  移至默认位置: "moved to the default location",
  "；分类与书签在同一事务写入。":
    "; the category and bookmarks are saved in one transaction.",
  已删除分类: "Category deleted",
  "受影响书签 ": "Affected bookmarks: ",
  " 个": " items",
  还有冲突未选择版本: "Some conflicts still need a version selected",
  "已选择 ": "Selected ",
  冲突已解决: "Conflicts resolved",
  "已提交 ": "Committed ",
  " 个版本": " versions",
  "\n\n请确认数据目录存在且为专用目录（空或仅含 `events`）。切换目录只改变本机配置，不搬迁、不删除旧库。":
    "\n\nEnsure the data directory exists and is dedicated (empty or containing only `events`). Changing directories changes only local settings; it does not move or delete the old library.",
  "# 本地库已暂停写入\n\n存在损坏、缺父、未知版本或超限的数据；不会以空库覆盖，也不会自动清理未知文件。\n\n":
    "# Local Library Is Read-Only\n\nCorrupt, missing-parent, unknown-version, or oversized data was found. The library will not be overwritten with an empty one, and unknown files will not be removed automatically.\n\n",
  搜索分类或功能: "Search categories or features",
  数据目录: "Data Directory",
  "专用目录：本地配置项；切换只改变本机配置，不搬迁、不删除旧库":
    "Dedicated directory: local setting only; changing it does not move or delete the old library",
  可写入: "Writable",
  "只读：存在冲突": "Read-only: conflicts",
  只读: "Read-only",
  "书签 ": "Bookmarks: ",
  "打开扩展设置（修改数据目录）":
    "Open Extension Preferences (Change Data Directory)",
  校验自选目录: "Validate Custom Directory",
  "连接共享 JSON 数据源…": "Connect Shared JSON Source…",
  复制数据目录: "Copy Data Directory",
  "未解决冲突（": "Unresolved Conflicts (",
  "普通写入已暂停，仅允许解决冲突":
    "Normal writes are paused; only conflict resolution is allowed",
  未选择: "Not selected",
  查看版本并选择: "View Versions and Select",
  应用全部冲突解决: "Apply All Conflict Resolutions",
  "；必须一次解决全部冲突": "; all conflicts must be resolved together",
  分类: "Categories",
  新建一级分类: "New Top-Level Category",
  "一级分类 · 书签 ": "Top-level category · Bookmarks: ",
  新建子分类: "New Subcategory",
  重命名: "Rename",
  "删除（书签移至默认位置）": "Delete (Move Bookmarks to Default)",
  "删除（书签移入回收站）": "Delete (Move Bookmarks to Trash)",
  "子分类 · 书签 ": "Subcategory · Bookmarks: ",
  图标: "Icons",
  补全缺失图标: "Fill Missing Icons",
  "为无图标或文字占位的书签抓取 favicon 并写入 icons/":
    "Fetch favicons for bookmarks with missing or placeholder icons and save to icons/",
  " 待处理": " pending",
  正在补全图标: "Filling missing icons",
  没有需要补全的图标: "No icons need filling",
  "已补全 ": "Filled ",
  " 个图标": " icons",
  补全失败: "Failed to fill icons",
  导入导出: "Import & Export",
  "导入 JSON": "Import JSON",
  "先预览统计与警告，再逐项决定同 ID 差异；一次事务写入":
    "Preview counts and warnings, choose each same-ID difference, then write in one transaction",
  "导出 JSON": "Export JSON",
  "另存到你选择的目录；不覆盖现有文件，不写回数据目录":
    "Save in a directory you choose; existing files and the data directory are never overwritten",
  "AI（可选 BYOK）": "AI (optional BYOK)",
  " · 模型：": " · Model: ",
  "已配置该协议 Key": "Key configured for this protocol",
  "缺少该协议 Key": "Key missing for this protocol",
  仅在你主动发送时请求: "Requests are sent only when you initiate them",
  "分类表（Catalog）": "Category Table (Catalog)",
  请填写分类名称: "Enter a category name",
  分类不存在: "Category not found",
  已保存分类: "Category saved",
  "在 ": "Create a subcategory in ",
  " 中新建子分类": " ",
  重命名一级分类: "Rename Top-Level Category",
  重命名子分类: "Rename Subcategory",
  保存: "Save",
  名称: "Name",
  "分类改动与书签移动在同一事务写入；默认分类与回收站不可删除。":
    "Category changes and bookmark moves are saved in one transaction; Default and Trash cannot be deleted.",
  选择要保留的版本: "Choose Version to Keep",
  " 个并发版本": " concurrent versions",
  "选择后返回上一页；全部冲突选择完才能应用":
    "Select a version and return; all conflicts must be selected before applying",
  "分类表：": "Category table: ",
  " 个一级分类": " top-level categories",
  "位置：": "Locations: ",
  "版本 ": "Version ",
  "墓碑（已删除）": "Tombstone (deleted)",
  "基数 ": "Base: ",
  " 次": " visits",
  选择并保留此版本: "Select and Keep This Version",
  选择并移入回收站: "Select and Move to Trash",
  选择并修复到默认位置: "Select and Repair to Default",
  预览导入: "Preview Import",
  "请选择 JSON 文件": "Select a JSON file",
  请选择普通文件: "Select a regular file",
  "文件超过 10 MiB 上限": "File exceeds the 10 MiB limit",
  预览失败: "Preview failed",
  接受的格式: "Accepted Formats",
  "本插件导出的 JSON，或 goose-mark / 旧 marks 的 {groups, bookmarks} 格式。remote/cache base64 图标会解码写入 icons/ 并转为 file；设置与 API Key 会被拒绝。":
    "JSON exported by this extension, or the {groups, bookmarks} format from goose-mark / older marks. Remote/cache base64 icons are decoded into icons/ as files; settings and API keys are rejected.",
  "JSON 文件": "JSON File",
  "还有 ": "There are ",
  " 个同 ID 差异未选择": " same-ID differences not selected",
  无变化: "No changes",
  "导入内容与本地一致，未写入事件":
    "Imported content matches local data; no event was written",
  导入已写入本地: "Import saved locally",
  "提交 ": "Committed ",
  " 个实体": " entities",
  导入预览: "Import Preview",
  统计: "Statistics",
  " · 一级分类 ": " · Top-level categories: ",
  "生成 ID ": "Generated IDs: ",
  " · 缺失时间 ": " · Missing timestamps: ",
  " · 与本地完全相同 ": " · Identical to local: ",
  "附件/图标字段 ": "Attachment/icon fields: ",
  "仅被动保留字段值；不读取、不复制、不下载附件":
    "Field values are preserved without reading, copying, or downloading attachments",
  "不同 ID 同 URL ": "Same URL with different IDs: ",
  "只提示，不会自动合并或删除多归属":
    "Notice only; no automatic merging or removal of multiple locations",
  警告: "Warnings",
  "同 ID 差异（": "Same-ID Differences (",
  "必须逐项选择，不能静默覆盖":
    "Choose each difference; never overwrite silently",
  "本地 ": "Local: ",
  " 个一级分类 → 导入后 ": " top-level categories → after import: ",
  "本地「": "Local “",
  "」/ 导入「": "” / Incoming “",
  查看完整差异并选择: "View Full Difference and Select",
  应用: "Apply",
  应用导入: "Apply Import",
  "待提交实体 ": "Entities to commit: ",
  " · 未选择差异 ": " · Unselected differences: ",
  "导入差异：": "Import Difference: ",
  保留本地版本: "Keep Local Version",
  采用导入版本: "Use Incoming Version",
  "逐字段比较本地与导入值（含网址、删除状态、位置、描述、标签与完整分类结构）。选择后还需回到预览应用；现有访问统计不被导入值覆盖。":
    "Compare local and incoming values field by field (URL, deletion status, locations, description, tags, and full category structure). Return to the preview to apply; imported values do not overwrite visit counts.",
  "（无此字段）": "(no field)",
  "（相同）": "(same)",
  "（有差异）": "(different)",
  "本地：\n": "Local:\n",
  "\n\n导入：\n": "\n\nIncoming:\n",
  导出: "Export",
  请选择导出目录: "Select an export directory",
  已导出本地已验证数据: "Verified local data exported",
  未导出: "Not exported",
  "只导出已验证且无冲突的数据；不包含 API 配置、数据目录路径或运行时设置。目标文件已存在时会拒绝写入，不覆盖。":
    "Only verified, conflict-free data is exported; API settings, directory paths, and runtime preferences are excluded. Existing destination files are never overwritten.",
  导出目录: "Export Directory",
  校验自选数据目录: "Validate Custom Data Directory",
  校验: "Validate",
  请选择一个已存在的目录: "Select an existing directory",
  请选择目录而不是文件: "Select a directory, not a file",
  "目录必须为空或仅含 events/icons，当前包含：":
    "Directory must be empty or contain only events/icons; currently contains: ",
  "# 目录可用\n\n`": "# Directory Available\n\n`",
  "`\n\n把这个路径填入扩展设置中的“Dedicated Data Directory”，然后重新加载命令：\n\n1. 命令 → 扩展设置（本命令的“打开扩展设置”操作）\n2. 粘贴上面的路径并保存\n3. 回到本命令重新加载\n\n切换只改变本机配置，不搬迁、不删除旧库；iCloud Drive 目录可用，但同步延迟、占位文件和并发写入不在本插件保证范围内。":
    "`\n\nEnter this path in “Dedicated Data Directory” under extension preferences, then reload:\n\n1. Command → Extension Preferences (the “Open Extension Preferences” action)\n2. Paste the path and save\n3. Return and reload\n\nChanging directories only changes local settings; it does not move or delete the old library. iCloud Drive can be used, but sync delays, placeholders, and concurrent writes are not guaranteed by this extension.",
  复制路径: "Copy Path",
  目录不可用: "Directory Unavailable",
  只做校验: "Validation Only",
  "这里只读取所选目录做检查，不创建、不搬迁、不删除数据，也不会替你写入扩展设置（Raycast 未提供写 preference 的 API）。":
    "Only reads the selected directory for validation. No data is created, moved, or deleted, and preferences are not written for you (Raycast has no API for writing them).",
  目录: "Directory",
  "请选择未损坏且不超过 10 MiB 的普通 JSON 文件":
    "Select a valid regular JSON file no larger than 10 MiB",
  "本地库与文件不一致（": "Local library differs from file (",
  " 项）": " items)",
  "确认连接共享文件？": "Connect shared file?",
  "已验证 JSON：": "Validated JSON: ",
  " 条书签、": " bookmarks, ",
  " 个分组。": " groups. ",
  "继续后以文件为准更新当前本地库；若要保留本地内容，请取消并先从“设置与数据”导出备份。":
    "Continuing updates the local library from this file. To keep local content, cancel and export a backup from Settings & Data first.",
  "文件与当前库一致。": "The file matches the current library.",
  "\n\n原事件目录不会删除。\n":
    "\n\nThe original events directory will not be deleted.\n",
  使用此文件: "Use This File",
  "已连接共享 JSON": "Shared JSON connected",
  "请选择目录并输入有效的 .json 文件名":
    "Choose a directory and enter a valid .json filename",
  "新文件写入失败且清理失败，请手工检查：":
    "Writing and cleaning up the new file failed; check manually: ",
  "已创建共享 JSON": "Shared JSON created",
  "共享 JSON 数据源": "Shared JSON Source",
  "使用已有 JSON 文件": "Use Existing JSON File",
  "连接失败，文件未覆盖": "Connection failed; file not overwritten",
  文件无效: "Invalid file",
  "新建 JSON 并初始化本地库": "Create JSON and Initialize Local Library",
  "创建失败，未覆盖文件": "Creation failed; file not overwritten",
  "已有 JSON": "Existing JSON",
  "有效文件作为权威数据源；确认后才会应用到当前本地库。损坏、缺失或冲突时阻断写入。":
    "A valid file becomes the authoritative source after confirmation. Writes are blocked if it is corrupt, missing, or conflicted.",
  " 当前连接：": " Connected: ",
  " 当前未连接。": " Not connected.",
  "选择 JSON 文件": "Choose JSON File",
  "新建 JSON": "New JSON",
  "仅在目标文件不存在时创建；使用当前本地库初始化，图标随 JSON 内嵌保存。可选择 iCloud Drive 目录。":
    "Created only when the destination does not exist. Initialized from the local library, with icons embedded in JSON. You may choose an iCloud Drive directory.",
  保存目录: "Save Directory",
  文件名: "Filename",
  "共享 JSON 基线缺失；为避免覆盖，请重新连接文件":
    "Shared JSON baseline missing; reconnect the file to avoid overwriting data",
  "本地库有尚未写入共享 JSON 的变更；请先导出备份，再重新连接文件":
    "Local changes are not yet in shared JSON; export a backup, then reconnect the file",
  "共享文件与本地库均有变化；检测到冲突，已阻断同步和写入":
    "Both shared file and local library changed; sync and writes are blocked due to conflict",
  "AI 地址无效：只允许 HTTPS 或本机 loopback HTTP":
    "Invalid AI URL: only HTTPS or local loopback HTTP is allowed",
  请选择要发送的字段: "Select fields to send",
  "AI 响应过大": "AI response too large",
  "AI 返回空响应": "AI returned an empty response",
  "AI 已取消或超时": "AI request canceled or timed out",
  "请配置所选协议的 API Key": "Configure an API key for the selected protocol",
  请配置模型名称: "Configure a model name",
  "AI 服务请求失败（HTTP ": "AI service request failed (HTTP ",
  "AI 请求或建议格式无效；未修改书签":
    "Invalid AI request or suggestion format; bookmark unchanged",
  "INVALID_INPUT: 不支持的网址": "INVALID_INPUT: Unsupported URL",
  "INVALID_INPUT: 模板不能改变协议或主机":
    "INVALID_INPUT: Template cannot change protocol or host",
  "INVALID_INPUT: 模板名称无效": "INVALID_INPUT: Invalid template name",
  "INVALID_INPUT: 请填写全部模板参数":
    "INVALID_INPUT: Fill all template parameters",
  仅可对已验证且无冲突的库导入或完整导出:
    "Import or complete export requires a verified conflict-free library",
  "导入含设置或秘密字段，请先移除（未显示字段值）":
    "Import contains settings or secrets; remove them first (values not shown)",
  "导入超过 10 MiB": "Import exceeds 10 MiB",
  "JSON 无效或不是对象": "Invalid JSON or not an object",
  不支持的导入版本或来源: "Unsupported import version or source",
  旧格式不得声明未知来源: "Legacy format cannot declare an unknown source",
  旧分类成员索引重复: "Duplicate legacy category membership index",
  "按固定 ID 补齐特殊分类 ": "Added missing special category with fixed ID ",
  "按固定 ID 补齐特殊位置 ": "Added missing special location with fixed ID ",
  "导入中书签 ID 重复，请先合并重复记录":
    "Duplicate bookmark ID in import; merge duplicates first",
  "旧成员索引与 locations 矛盾，请在源文件明确修复后重试":
    "Legacy membership index conflicts with locations; fix the source file and retry",
  "无位置书签已分配默认位置（ID: ":
    "Bookmark without location assigned to Default (ID: ",
  删除状态与旧回收站位置矛盾:
    "Deletion state conflicts with legacy Trash location",
  书签引用无效分类: "Bookmark references an invalid category",
  "历史恢复位置已有删除，恢复时会回退到默认位置":
    "Previous restore location was deleted; restoration will use Default",
  旧分类索引引用不存在书签:
    "Legacy category index references a nonexistent bookmark",
  " 个缺失 ID 已在本预览固定生成": " missing IDs generated for this preview",
  " 个缺失时间：createdAt 使用预览时间，updatedAt 使用 createdAt；已有时间按原毫秒值保留":
    " missing timestamps: createdAt uses preview time, updatedAt uses createdAt; existing millisecond timestamps are preserved",
  " 个图标附件将在导入时落盘；旧 file 路径不读取，改为使用站点图标":
    " icon attachments will be saved on import; old file paths are never read and site icons are used instead",
  "已有 ID ": "Existing ID ",
  "：保留本地访问统计，导入统计不覆盖":
    ": local visit counts are preserved; imported counts do not overwrite them",
  " 个不同 ID 同 URL，保留为独立书签":
    " same URLs with different IDs are kept as separate bookmarks",
  图标附件不可用: "Icon attachment unavailable",
  "请明确选择所有同 ID 差异": "Select a choice for every same-ID difference",
  "图标文件已丢失，无法完整导出": "Icon file missing; cannot export completely",
  "图标不在本地库目录，无法安全导出":
    "Icon is outside the local library; cannot export safely",
  图标格式或大小无效: "Invalid icon format or size",
  "备份超过 10 MiB，无法完整导出":
    "Backup exceeds 10 MiB; cannot export completely",
  导出路径必须是绝对路径: "Export path must be absolute",
  不能导出到事件数据目录: "Cannot export into the events data directory",
  "无法导出：目标已存在或写入失败；请检查目标文件，不覆盖重试":
    "Export failed: destination exists or write failed; check the destination before retrying without overwriting",
  数据格式无效: "Invalid data format",
  时间或计数无效: "Invalid timestamp or count",
  "含未知字段，请移除设置或秘密字段":
    "Unknown fields present; remove settings or secrets",
  位置重复: "Duplicate location",
  不支持的网址或模板: "Unsupported URL or template",
  图标类型无效: "Invalid icon type",
  图标字段无效: "Invalid icon fields",
  "分类 ID 重复": "Duplicate category ID",
  默认分类与回收站必须保留: "Default and Trash categories must be kept",
  默认: "Default",
  已删除: "Deleted",
  未分类: "Uncategorized",
  书签不是删除状态: "Bookmark is not deleted",
  默认分类与回收站禁止删除: "Default and Trash cannot be deleted",
  "事件 ID 无效": "Invalid event ID",
  "目录或文件不可用；未写入，请检查本地下载和权限":
    "Directory or file unavailable; not saved. Check local download and permissions",
  数据目录必须为绝对路径: "Data directory must be an absolute path",
  数据目录不存在: "Data directory does not exist",
  "请选择空目录或仅包含 events/icons 的专用目录":
    "Choose an empty dedicated directory or one containing only events/icons",
  请重新确认专用目录路径: "Reconfirm the dedicated directory path",
  专用目录出现未知文件: "Unknown file found in dedicated directory",
  "events 必须是专用目录内的真实子目录":
    "events must be a real subdirectory of the dedicated directory",
  "icons 必须是专用目录内的真实子目录":
    "icons must be a real subdirectory of the dedicated directory",
  拒绝非普通文件或符号链接: "Regular files only; symlinks are rejected",
  文件超过大小上限: "File exceeds size limit",
  文件在读取前发生变化: "File changed before it could be read",
  不支持的事件版本: "Unsupported event version",
  单事务不能重复修改同一实体:
    "Cannot change the same entity twice in one transaction",
  父版本重复或自引用: "Duplicate parent version or self-reference",
  "实体 ID 不一致": "Entity ID mismatch",
  空事务被拒绝: "Empty transaction rejected",
  "同一事件 ID 内容不同": "Same event ID has different content",
  事件事务依赖缺失或存在环:
    "Event transaction has missing or circular dependencies",
  父事件尚未到达本机或引用了错误实体:
    "Parent event has not arrived locally or references the wrong entity",
  事件依赖存在环: "Circular event dependency",
  "多个并发版本，必须明确选择后才能继续写入":
    "Multiple concurrent versions; select one explicitly before writing",
  访问事件引用不存在的书签: "Visit event references a nonexistent bookmark",
  "分类引用不存在或删除状态与回收站位置矛盾；请修复位置":
    "Category reference is missing or deletion state conflicts with Trash location; repair locations",
  目录文件数超过上限: "Directory file count exceeds limit",
  "事件数超过 10,000 上限": "Event count exceeds the 10,000 limit",
  事件目录包含非普通文件: "Events directory contains a non-regular file",
  事件目录包含未知正式文件:
    "Events directory contains an unknown committed file",
  事件库超过首版容量上限: "Event library exceeds capacity limit",
  "事件无效：": "Invalid event: ",
  事件文件名与内容不一致: "Event filename does not match content",
  "事务超过 10 MiB，未写入": "Transaction exceeds 10 MiB; not saved",
  目录在写入时发生变化: "Directory changed during write",
  "发布后核验失败；不要自动重试，请重新读取":
    "Post-publish verification failed; do not retry automatically. Reload instead",
  "本地已写入；临时文件清理失败，未重试提交":
    "Saved locally, but temporary-file cleanup failed; commit was not retried",
  "可能已写入，请重新读取，禁止自动重试":
    "May have been saved; reload and do not retry automatically",
  "未发布事件：文件系统不支持安全发布、无权限或文件已存在":
    "Event not published: filesystem cannot publish safely, permission denied, or file already exists",
  "数据已变化，请重新打开表单或预览":
    "Data changed; reopen the form or preview",
  "存在未解决冲突，全库暂停普通写入":
    "Unresolved conflicts; normal writes are paused for the entire library",
  解决冲突不能追加访问: "Cannot add visits while resolving conflicts",
  实体父版本已变化: "Entity parent version changed",
  "编辑不能修改访问基数；请选择已有版本的基数":
    "Editing cannot change the base visit count; choose an existing version's count",
  "事务未解决所有冲突或产生无效分类引用，未写入":
    "Transaction did not resolve all conflicts or created an invalid category reference; not saved",
  "事务或事件库超过容量上限，未写入":
    "Transaction or event library exceeds capacity; not saved",
  "共享 JSON 存储尚未就绪": "Shared JSON storage not ready",
  "图标数据格式无效，拒绝写入共享 JSON：":
    "Invalid icon data; shared JSON write rejected: ",
  "图标超过 2 MiB 或编码无效，拒绝写入共享 JSON：":
    "Icon exceeds 2 MiB or encoding is invalid; shared JSON write rejected: ",
  "共享 JSON 缺失、不是普通文件或超过 10 MiB；已阻断写入":
    "Shared JSON is missing, not a regular file, or over 10 MiB; writes blocked",
  "共享 JSON 在读取时发生变化；已阻断写入":
    "Shared JSON changed while being read; writes blocked",
  "共享 JSON 超过 10 MiB；已阻断写入":
    "Shared JSON exceeds 10 MiB; writes blocked",
  "图标文件缺失，拒绝写入共享 JSON：":
    "Icon file missing; shared JSON write rejected: ",
  "图标格式不支持，拒绝写入共享 JSON：":
    "Unsupported icon format; shared JSON write rejected: ",
  "图标路径无效，拒绝写入：": "Invalid icon path; write rejected: ",
  "图标文件不可用，拒绝写入：": "Icon file unavailable; write rejected: ",
  "图标不在本地库 icons 目录，拒绝写入：":
    "Icon is outside the local library's icons directory; write rejected: ",
  "写入前共享 JSON 再次变化；拒绝覆盖":
    "Shared JSON changed again before writing; overwrite rejected",
  "共享 JSON 尚未初始化；请重新连接以阻断写入":
    "Shared JSON is not initialized; reconnect before writing",
  "共享 JSON 已被外部修改；当前写入已阻断":
    "Shared JSON was modified externally; current write blocked",
  未知错误: "Unknown error",
  "本地事务已成功，但共享 JSON 未更新：":
    "Local transaction succeeded, but shared JSON was not updated:",
};
let language: "en" | "zh-Hans" = "en";
export function setLanguage(value?: string) {
  language = value === "zh-Hans" ? "zh-Hans" : "en";
}
export function t(value: string): string;
export function t(parts: TemplateStringsArray, ...values: unknown[]): string;
export function t(
  value: string | TemplateStringsArray,
  ...values: unknown[]
): string {
  if (typeof value === "string")
    return language === "zh-Hans" ? value : (english[value] ?? value);
  return value.reduce(
    (result, part, index) =>
      result +
      (language === "zh-Hans"
        ? part
        : (english[part] ??
          part
            .replaceAll("？", "?")
            .replaceAll("（", "(")
            .replaceAll("）", ")")
            .replaceAll("；", "; ")
            .replaceAll("、", ", ")
            .replaceAll("，", ", ")
            .replaceAll("「", "“")
            .replaceAll("」", "”"))) +
      (index < values.length ? String(values[index]) : ""),
    "",
  );
}

// Built-in labels are persisted in Chinese; translate them only when rendered.
export function categoryTitle(id: string, name: string): string {
  const builtIn: Record<string, string> = {
    "g-default": "默认",
    "sg-default": "未分类",
    "g-trash": "回收站",
    "sg-trash": "已删除",
  };
  return builtIn[id] === name ? t(name) : name;
}
