# Raycast-Baidu-Screenshot-OCR

## 配置&使用

1. 在百度云创建应用

[百度智能云-登录](https://console.bce.baidu.com/ai/?fromai=1#/ai/ocr/app/list)

2. 点击页面中的创建应用

![Image.png](https://res.craft.do/user/full/25a26439-c871-eb0f-88d6-9970f964746d/doc/1AD3B663-8FA8-4243-AFB0-AFA323DC2B0B/A60D3686-C1E3-4B27-8212-6FD1CD6EEC3A_2/JMXLU4ZqsbT4gk2SkZBBK62eHhEja5U1z1O9ZGI1WeMz/Image.png)

3. 输入应用名称，归属选择个人，默认全选即可

![Image.png](https://res.craft.do/user/full/25a26439-c871-eb0f-88d6-9970f964746d/doc/1AD3B663-8FA8-4243-AFB0-AFA323DC2B0B/76B811C9-5AEF-4943-A99D-4AE56CD7B0E4_2/I9giuWy7lYJJe3T1PW4Dd1tuB6dLS0FaDxI0V3csdXcz/Image.png)

![Image.png](https://res.craft.do/user/full/25a26439-c871-eb0f-88d6-9970f964746d/doc/1AD3B663-8FA8-4243-AFB0-AFA323DC2B0B/2433D591-1C93-49D2-95F8-0788D9E5AA7B_2/RLEtzcAB2rpRpDHzS9y2gz7WSsO2cy8m8ON6JIOEzxYz/Image.png)

4. 创建成功后，复制应用的API Key和Secret Key到Raycast的插件中

![Image.png](https://res.craft.do/user/full/25a26439-c871-eb0f-88d6-9970f964746d/doc/1AD3B663-8FA8-4243-AFB0-AFA323DC2B0B/0C239E8C-07A1-4EA5-B682-1139476E82A5_2/d04ijrcXuLNgIEc0KKyziTe1sjYTiUiWmBHK8HqWHpQz/Image.png)

![Image.png](https://res.craft.do/user/full/25a26439-c871-eb0f-88d6-9970f964746d/doc/1AD3B663-8FA8-4243-AFB0-AFA323DC2B0B/89470195-6BFF-49C3-95B9-DB10FC98BD24_2/tzfq6rAimZyKTtLxxWruKvbS5nzLkO4BGNsAkVTejhwz/Image.png)

5. 给插件配置快捷键，即可选取截图，并将OCR结果自动粘贴到剪切板

![AnimatedImage.gif](https://res.craft.do/user/full/25a26439-c871-eb0f-88d6-9970f964746d/doc/1AD3B663-8FA8-4243-AFB0-AFA323DC2B0B/6C06DE2C-12AC-4466-994B-19993146AED9_2/jEex6oX5P8jEMNlBOhkiMCclTFbnzrSgkcXYtlp1Nncz/AnimatedImage.gif)

这边我设置了快捷键为f2，按下f2即可弹出区域截图。截图完毕后，提示OCR结果复制到剪贴板，最终的内容是：

```typescript
个人认证：1,000
次/月；
企业认证：
2,000次/月
```

6. 百度的个人调用API是个人认证：1,000次/月

