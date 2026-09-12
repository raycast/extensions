# raycast-extension-ones

<p align="center">
<a href="https://github.com/k8scat/raycast-extension-ones"><img src="https://img.shields.io/github/stars/k8scat/raycast-extension-ones.svg?style=flat&logo=github&colorB=deeppink&label=stars"></a>
<a href="https://github.com/k8scat/raycast-extension-ones"><img src="https://img.shields.io/github/forks/k8scat/raycast-extension-ones.svg"></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="License: MIT"></a>
</p>

[Raycast](https://www.raycast.com/) extension for [ONES](https://ones.ai).

## 安装

### 通过 [源码](https://github.com/k8scat/raycast-extension-ones)

```bash
git clone https://github.com/k8scat/raycast-extension-ones.git
cd raycast-extension-ones
npm install
npm run dev # 这将安装该插件, 然后你可以停止它。
```

### 通过插件市场

网页的插件市场: [https://www.raycast.com/k8scat/ones](https://www.raycast.com/k8scat/ones).

或者在应用的插件市场里搜索 `ONES`。

## 支持

- 内容搜索
  - Project
    - [x] 项目
    - [x] 工作项
      - [x] 登记工时
      - [x] 删除工作项
    - [x] 迭代
    - [x] 文件
  - Wiki
    - [x] 页面组
    - [x] 页面
    - [x] 文件
- 工时管理
  - [x] 查询
  - [x] 修改
  - [x] 登记
  - [x] 删除

## 配置

| 名称          | 是否必填 | 描述                                                   | 默认值                             |
| ------------- | -------- | ------------------------------------------------------ | ---------------------------------- |
| URL           | 是       | ONES 访问地址                                          | [https://ones.ai](https://ones.ai) |
| Email         | 是       | ONES 登录邮箱                                          |                                    |
| Password      | 是       | ONES 登录密码                                          |                                    |
| Team UUID     | 否       | 团队 UUID                                              |                                    |
| Manhour Owner | 否       | 工时登记人的名称或 UUID                                | 当前登录用户                       |
| Manhour Days  | 否       | 工时查询天数                                           | 7                                  |
| Manhour Task  | 否       | 工时登记工作项                                         |                                    |
| Manhour Mode  | 否       | 工时模式，支持 `Simple` 简单模式和 `Detailed` 汇总模式 | Simple 简单模式                    |

## 主仓库

[k8scat/raycast-extension-ones](https://github.com/k8scat/raycast-extension-ones.git)

## 作者

[K8sCat](https://github.com/k8scat)

## 开源协议

[MIT](./LICENSE)
