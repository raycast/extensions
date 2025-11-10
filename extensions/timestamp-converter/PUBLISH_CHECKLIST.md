# 发布检查清单 ✅

在运行 `npm run publish` 之前，请确保完成以下步骤：

## 必须完成 (Required)

- [ ] **注册 Raycast 账号**
  - 访问 https://www.raycast.com/store
  - 登录或注册账号
  - 记住你的用户名

- [ ] **更新 author 字段**
  - 打开 `package.json`
  - 将 `"author": "liluo"` 改为你的 Raycast 用户名
  - 例如：`"author": "your-username"`

- [ ] **测试扩展功能**
  ```bash
  npm run dev
  ```
  - 确保所有功能正常工作
  - 测试转换时间戳
  - 测试转换日期时间
  - 测试当前时间显示
  - 测试偏好设置

## 强烈推荐 (Highly Recommended)

- [ ] **添加截图**
  - 在 Raycast 中使用扩展并截图
  - 至少 2-3 张展示核心功能
  - 保存到 `metadata/` 目录
  - 命名为 `timestamp-converter-1.png`, `timestamp-converter-2.png` 等

- [ ] **运行代码检查**
  ```bash
  npm run lint
  ```
  - 确保没有错误
  - 如果有格式问题，运行 `npm run fix-lint`

## 可选优化 (Optional)

- [ ] **优化 README**
  - 添加更多使用示例
  - 添加 GIF 演示
  - 添加常见问题解答

- [ ] **检查图标**
  - 确保 `command-icon.png` 清晰美观
  - 尺寸：512x512 px
  - 格式：PNG

## 🚀 准备发布

完成上述步骤后，运行：

```bash
npm run publish
```

然后按照命令行提示操作。

## 📞 需要帮助？

- [Raycast Developers 文档](https://developers.raycast.com/)
- [Raycast Store 指南](https://developers.raycast.com/basics/publish-an-extension)
- [Raycast Slack 社区](https://raycast.com/community)

---

**祝你发布顺利！** 🎉

