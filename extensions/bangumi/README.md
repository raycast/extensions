<a href="http://bgm.tv" title="Bangumi 番组计划"><img align="right" src="http://bgm.tv/img/ico/bgm_banner.gif" border="0" alt="" /></a>

# raycast-bangumi

| 简体中文 | [English](./README_en.md) |

一个基于 Raycast 的 Bangumi 客户端，直接在 Raycast 中浏览、管理你在 [bangumi.tv](https://bangumi.tv) 上的进度。

## 功能

- **列出收藏 (List Collections):** 显示全部的收藏。
- **列出当前收藏 (List Current Collections):** 管理你的状态为「在看/在玩/在读」的条目。
- **每日放送 (Daily Calendar):** 查看每日放送。
- **搜索条目 (Search Subjects):** 在 Bangumi 上搜索。
- **AI 工具 (AI Tools):** 全面接入 Raycast AI，你可以直接在对话中让 AI 帮你管理进度、搜索番剧。


| 详情页 | 每日放送 |
| - | - |
| <img src="https://github.com/user-attachments/assets/e5f5c33e-8f0d-4657-8c42-a01be8e67c78" /> | <img src="https://github.com/user-attachments/assets/641beeb6-6f2b-4215-832c-675528e2d078" /> |

| 当前收藏 | 进度管理 |
| - | - |
| <img src="https://github.com/user-attachments/assets/e7049ec1-936a-45ab-ad35-f1e66f9b4681" /> | <img src="https://github.com/user-attachments/assets/e4765cec-71ea-4531-b413-ae1ef3148e3b" /> |


| 查看进度 | 每日放送 | 搜索 | 状态更新 |
| - | - | - | - |
| ![](https://github.com/user-attachments/assets/ebfba7e3-7b0f-4324-92e1-f37637cf2755) | ![](https://github.com/user-attachments/assets/b2d4e85c-0224-411c-bc8f-1ed6b3acd14c) | ![](https://github.com/user-attachments/assets/1665953f-ca15-460e-bb30-45b32a968101) | ![](https://github.com/user-attachments/assets/46f8d7e6-f35b-43f7-9025-3f2d19dd9284) |


## 安装指南

1. 在 Raycast Store 中搜索 `bangumi`，并选择安装。
2. 首次使用时，需要登录你的 Bangumi 账号。请按照提示完成登录流程。
   <img width="50%" src="https://github.com/user-attachments/assets/9631328a-9b22-4f98-b2b9-68a36e661065" />

## 设置

你可以在设置中自定义**收藏列表**中需要显示的分类：

<table>
  <tr>
    <td width="50%">
      <img src="https://github.com/user-attachments/assets/84ca0109-d773-44be-92b6-61daa01122d6" />
    </td>
    <td>

| 设置项     | 默认值  |
| ---------- | ------- |
| 显示书籍   | `true`  |
| 显示动画   | `true`  |
| 显示音乐   | `false` |
| 显示游戏   | `false` |
| 显示三次元 | `true`  |

</td>
  </tr>
</table>

## Credits

- [yjl9903/bgmx](https://github.com/yjl9903/bgmx) - 参考了部分实现细节。
- [bangumi/api](https://github.com/bangumi/api) - 感谢 Bangumi 官方提供的 API。

## LICENSE

[MIT](LICENSE)
