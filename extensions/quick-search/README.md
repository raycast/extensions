# raycast-quick-search

Use a global keyboard shortcut to quickly search selected text or clipboard text via Google or Github or DeepL etc.

## How is this extension different from Raycast's built-in "Quick Link"?

`Quick Link` is a very good feature, it is equivalent to a shortcut entrance (a wormhole) through which you can quickly get to any address you want to go to.
`Quick Search` is similar to it in terms of functionality, but it focuses more on using shortcuts to improve search efficiency.

Suppose the following scenario.

Ivan is a front-end development engineer. He is reading a technical article about "React" and he finds a technical term that he doesn't understand.
At this point he wants to google for the technical term, he first selects that term by double-clicking on it and then presses `Command + C`, copying it to the clipboard.

If he wants to search via `Quick Link`, there are several ways to do so.

- Open the Raycast launcher and search for "Quick Link"
- Open the Raycast launcher and search for Alias of "Quick Link"
- Open "Quick Link" directly via Hotkey

But after opening `Quick Link`, Ivan had to enter `Query` (the keyword to be queried).
Fortunately, Ivan has already copied it to the clipboard, so he just needs to press `Command + V`, and then he can press <kbd>Enter</kbd> to open the Google search page.

If Ivan uses `Quick Search`, he can open the Google search page directly via Hotkey when he selected the technical term in that post.

The difference between Quick Search and Quick Link is that Quick Search automatically retrieves the `Query` from the selected text and clipboard, and then opens the specific search address directly.
This skips the step where Ivan enters the `Query` and makes the search much faster.

## 此扩展与 Raycast 内置的 "Quick Link" 有何不同？

`Quick Link` 是非常好的功能，它相当于一个快捷入口（一个虫洞），通过它你可以快速到达你想去的任何地址。
`Quick Search` 虽然在功能上与它比较相似，但它更注重于使用快捷键来提高搜索效率。

假设有如下场景：

Ivan 是一个前端开发工程师。他正在阅读一篇关于“React”的技术文章，并且他发现了一个不了解的技术名词。
此时他想要搜索这个技术名词，他首先通过双击选中了那个技术名词，然后按下了 `Command + C`, 将其复制到剪贴板中。

如果他想通过 `Quick Link` 搜索，有如下几种方式：

- 打开 Raycast 启动器搜索 "Quick Link"
- 打开 Raycast 启动器搜索 "Quick Link" 的 Alias
- 通过 Hotkey 直接打开"Quick Link"

但是在打开 `Quick Link` 之后，Ivan 必须输入`Query`(需要查询的关键字)。
不过好在 Ivan 已经将它复制到了剪贴板中，他只需要按下 `Command + V` 即可，再之后才能按下 <kbd>Enter</kbd> 打开 Google 搜索页面。

如果使用 `Quick Search`， 那么在 Ivan 选中那个技术名词的时候，他就已经可以通过 Hotkey 来直接打开 Google 搜索页面。

Quick Search 和 Quick Link 的不同就在于 Quick Search 可以自动的从选中文本和剪贴板中自动获取 `Query`(需要查询的关键字)，然后直接打开特定的搜索地址。
这跳过了由 Ivan 输入`Query` 的步骤，从而使得搜索更加的快速。
