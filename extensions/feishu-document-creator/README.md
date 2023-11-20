# Feishu Document Creator

Create Feishu document in one click using native Feishu/Lark URLs.

## Feishu/Lark URLs:

| App Name | Host | Path | Parameters |
| :-: | :-: | :-: | :-: |
| Feishu | https://www.feishu.cn | /drive/create | type |
| Lark | https://www.larksuite.com | /drive/create | type |

**type**

Specify the type of Feishu/Lark document to create.

| Value | Description |
| :-: | :-: |
| `docx` | Pure document. |
| `base` | Feishu/Lark Base. |
| `sheet` | Pure sheet. |
| `mindnote` | Mind map. |

**Example:**

New a pure Feishu document by accessing `https://www.feishu.cn/drive/create?type=docx`.