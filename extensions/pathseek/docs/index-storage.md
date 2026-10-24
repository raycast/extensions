# PathSeek 索引存储

PathSeek 的索引保存在 Raycast 提供的 `environment.supportPath` 目录中，不在 Git 仓库，也不是 Raycast 加密的 LocalStorage。运行 **View Index Status** 可以查看构建时间、路径数量和存储位置。

## 手动索引

- 第一次运行 **Build Index**，自行选择一个或多个目录，再明确提交建立索引。
- 修改目录或扫描选项后，仍须手动执行 **Rebuild Index Now** 才会更新搜索结果。
- 打开 Raycast、搜索、查看状态、修改目录以及长时间不使用时，**都不会自动启动 `fd`**。
- 搜索通过 `fzf` 读取已发布的索引；不会为了搜索词重新扫描文件系统。

## v2 格式

当前索引文件固定为 `index.nul`，在同一个文件内保存元信息头和 NUL 分隔的绝对路径。

```text
[8 bytes: "PSIDX002"]
[4 bytes: little-endian JSON header length]
[JSON metadata: version, createdAt, count, roots]
[UTF-8 absolute path][NUL]
[UTF-8 absolute path][NUL]
...
```

使用 NUL 分隔可以正确处理路径中的中文、空格和换行。新文件先写入临时路径并校验，然后原子替换当前 `index.nul`；同一份打开的文件描述符供读者读取头部与路径，避免读取过程中混用新旧索引。

对早期 v1 格式 `index.json + index-<UUID>.nul` 保留兼容读取；在新版构建成功、经过宽限期后，旧数据可被清理。失败的构建不会在发布前破坏当前索引。

**隐私注意：** 索引包含真实的文件名与绝对路径，不要把 `index.nul` 上传到公开 Issue。排查问题请使用 **View Diagnostics → Copy Sanitized Debug Info**。
