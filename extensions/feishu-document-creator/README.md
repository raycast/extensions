# Feishu Document Creator

Create Feishu/Lark document in one click using native Feishu/Lark URLs.

## Preview Screenshot

![Feishu Document Creator Preview-1](https://github.com/rokcso/feishu-document-creator/blob/main/metadata/feishu-document-creator-1.png)

![Feishu Document Creator Preview-2](https://github.com/rokcso/feishu-document-creator/blob/main/metadata/feishu-document-creator-2.png)

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