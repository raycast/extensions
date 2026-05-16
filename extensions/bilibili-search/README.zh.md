# Bilibili Search

在 Raycast 中搜索、浏览并打开 Bilibili 内容。

## 功能特性

- 搜索 Bilibili 视频、番剧、影视、直播、专栏和用户。
- 搜索词为空时可浏览热门视频。
- 使用 Bilibili 手机 App 扫码登录，解锁账号相关命令。
- 查看 Bilibili 观看历史，支持分页和视频详情。
- 浏览收藏夹，支持在单个收藏夹内搜索，也支持跨全部收藏夹搜索。
- 在搜索命令中浏览关注的 UP 主、追番和追剧/电影。
- 展示封面、作者、时长、发布时间、标签、播放、点赞、投币、收藏、评论、弹幕、评分、演员和制作人员等详情。
- 可从 Action Panel 打开浏览器或复制链接。

## 命令

### Search Bilibili

跨类型搜索 Bilibili 内容。

支持分类：

- Video：视频
- Anime：番剧
- Movie/TV：影视
- Live：直播
- Article：专栏
- User：用户

使用说明：

- 在 Video 分类下留空搜索词，会展示热门视频。
- 可通过搜索栏右侧下拉菜单切换分类。
- 可在 Action Panel 中使用 `Control + Arrow Right` / `Control + Arrow Left` 切换分类。
- 使用 `Control + B` 显示或隐藏详情面板。
- 使用 `Control + C` 复制当前结果链接。
- 使用 `Control + Enter` 在浏览器中打开当前关键词的 Bilibili 搜索。
- 浏览关注 UP、追番或追剧/电影时，可用 `:` 前缀进行本地过滤，例如 `:音乐`。

### Login Bilibili

通过 Bilibili 手机 App 扫描二维码登录。

登录后，插件会将 Bilibili Cookie 存储在 Raycast 本地缓存中，用于 History 和 Favorites 等需要登录的命令。

### History

查看 Bilibili 观看历史。

- 需要先登录。
- 支持分页加载。
- 展示视频详情和统计数据。
- 支持在浏览器中打开视频和复制视频链接。

### Favorites

查看 Bilibili 收藏夹。

- 需要先登录。
- 可从下拉菜单选择收藏夹。
- 可选择 All Favorites 跨全部收藏夹搜索。
- 在 All Favorites 模式下，需要先输入搜索词；插件不会预先加载全部收藏内容。
- 展示视频详情和统计数据。

## 偏好设置

| 设置项 | 说明 |
| --- | --- |
| Default Favorite Folder | 可选，默认打开的收藏夹名称。留空或未匹配到时，会使用第一个收藏夹。 |

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Control + B` | 显示/隐藏详情 |
| `Control + C` | 复制当前链接 |
| `Control + Enter` | 在浏览器中搜索当前关键词 |
| `Control + Arrow Right` | 切换到下一个搜索分类 |
| `Control + Arrow Left` | 切换到上一个搜索分类 |
| `Control + R` | 在 User 分类中刷新关注用户数据 |

## 开发

安装依赖：

```bash
npm install
```

启动 Raycast 开发模式：

```bash
npm run dev
```

检查代码：

```bash
npm run lint
```

构建插件：

```bash
npm run build
```

发布到 Raycast Store：

```bash
npm run publish
```

## 项目结构

```text
assets/                 插件图标
src/bilibili-search.tsx 主搜索命令
src/login.tsx           扫码登录命令
src/history.tsx         观看历史命令
src/favorites.tsx       收藏夹命令
src/utils/              Bilibili API 和登录辅助逻辑
```

## 隐私说明

插件会请求 Bilibili API 获取搜索结果和账号数据。登录 Cookie 保存在 Raycast 本地缓存中，仅用于观看历史、收藏夹、关注列表、追番和追剧/电影等需要登录的 Bilibili 请求。

## 致谢与参考

本插件参考了 Raycast 插件生态中已有的 Bilibili 插件，并在此基础上进行独立实现，重点补充了更丰富的搜索分类、账号相关浏览能力和详情视图。

## 注意事项

Bilibili API 的响应结构和可用性可能变化。如果命令无法返回结果，可以尝试重新登录或稍后再试。
