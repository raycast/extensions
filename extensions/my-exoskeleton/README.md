# My Exoskeleton

## Environment

Reference to [Raycast System Requirement](https://developers.raycast.com/basics/getting-started)

## 一、环境依赖

- node v16.10.0
- npm v7.24.0

推荐使用 `nvm` 安装 `node` 和切换 `node` 版本。在根目录下执行 `nvm use` 会切换到 `.nvmrc` 中指定的 `16.10.0` 版本。

## 二、开发相关

```shell
npm install # 安装依赖
npm run dev # 本地开发
npm run build # 打包
npm run publish # 发布新版本
npm run lint # 代码校验
npm run fix-lint # 代码校验修复
```

## 三、Manifest 配置

[Extension properties](https://developers.raycast.com/information/manifest#extension-properties)

[Command properties](https://developers.raycast.com/information/manifest#command-properties)

[Preference properties](https://developers.raycast.com/information/manifest#preference-properties)

## 四、文件及目录

- .github
  - workflows
    - release.yml     GitHub Action 配置文件
- assets              静态文件，不编译
  - icons             存放图标
  - images            存放图片
  - shell             脚本命令
- src
  - apis              定义API接口和类型
  - commands          Command 组件
  - constants         定义常量
  - types             定义类型
  - utils             工具方法
  - *.ts              Command 入口(与 `package.json` 中的 `commands.name` 对应)
- .nvmrc              nvm 配置文件，指定 node 版本
- .eslintrc.json      ESlint 配置文件
- .prettierrc         Prettier 配置文件
- CHANGELOG.md        版本更新日志
- package.json        npm 配置文件
- tsconfig.json       typescript 配置文件

## 代码规范

### 文件&目录命名

1. tsx 文件名建议使用 `首字母大写 + 驼峰 (CamelCase)`，例如 GoCD.tsx
2. （src 根目录除外）非 tsx 文件名，建议使用 `首字母小写 + 驼峰 (camelCase)`，例如 gocdPipelines.ts
3. 文件夹名称建议使用 `小写 + 中划线（kebabCase）`，例如my-project

### 字段&函数名

1. 定义变量或函数名，建议 `首字母小写 + 驼峰 (camelCase)`，例如 userName
2. 定义常量，建议 `首字母大写 + 驼峰 (CamelCase)`，例如 UserName
3. 定义全局常量，建议 `全大写字母 + 下划线`，例如 USER_NAME
