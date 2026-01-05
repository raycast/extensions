## 背景
我之前开发了一个cli功能，地址是`https://www.npmjs.com/package/@vkbo/codename`。它的功能是在命令行输入`codename`之后，就可以生成一个随机的`XX-11`这样字母与数字结合的的字符串。
我觉得因为需要打开Terminal，执行命令之后需要复制+粘贴，还是不是很方便。因为我本身在使用Raycast，同时也考虑到Raycast有很多潜在的用户，所以我想开发一个Raycast Extension来实现这个需求。

关于技术方面，我了解web开发，但是我完全没有看过Raycast Extension开发相关的文档，我大概知道Raycast本质上也是Node.js的开发（如果我有错可以纠正我），所以我之前写的NPM包大概率是快成服用的。

## 参考
你可以参考`https://github.com/vkboo/codename`这里的代码实现，这本就是上面提及的NPM包的源代码，其逻辑实现可以完全复用。

## 实现
确定Raycast Extension的名字是`codename`，icon你可以跟我我的名字和业务需求自己画一个（需要符合审美且简约大方）。

这个extension只有一个功能，就是执行了之后，生成`XX-11`这样的随机代码。 
    - 用户使用键盘快捷键`CMD + Enter`，可以拷贝到剪切板
    - 用户使用`CMD + K`，展示菜单，其中有两项item，一项依然是`拷贝到剪切板`，另一项是`Generate Again`

其他注意：
    - Extension面向英语使用者，所以语言、文案都需要使用英文
    - 考虑到有Windows用户，此时快捷键种的`CMD` -> `Ctrl`