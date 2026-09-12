# Feishu Document Creator

Create Feishu/Lark online document quickly using native Feishu/Lark URLs.

[Reference](https://www.feishu.cn/hc/zh-CN/articles/141734813422-%E5%BF%AB%E9%80%9F%E5%88%9B%E5%BB%BA%E9%A3%9E%E4%B9%A6%E4%BA%91%E6%96%87%E6%A1%A3)

## Feishu/Lark URLs

| App Name | Host | Path | Parameters |
| :-: | :-: | :-: | :-: |
| Feishu | https://www.feishu.cn | /drive/create | type |
| Lark | https://www.larksuite.com | /drive/create | type |

**Enumerated value of parameter `type`:**

Specify the type of Feishu/Lark document to create.

| Value | Description |
| :-: | :-: |
| `docx` | Pure document. |
| `base` | Feishu/Lark Base. |
| `sheet` | Pure sheet. |
| `mindnote` | Mind map. |

**Example:**

New a Feishu Online base document by accessing `https://www.feishu.cn/drive/create?type=base`.
