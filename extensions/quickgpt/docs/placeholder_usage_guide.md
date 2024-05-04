In our codebase, we use placeholders to represent different types of inputs. They are written in the format {{p:x}}, {{x}}, or {{x|y|z}}, where x, y, and z can be one of the following:

- i: Represents a query input.
- s: Represents a selection input.
- c: Represents a clipboard input.

### {{x}} Placeholders

These placeholders are replaced with the actual input values. For example, if you see {{s}} in the code, it means that this placeholder will be replaced with the selected text input.
{{p:x}} Placeholders

These placeholders are replaced with a literal representation of the input type. For example, if the input is a query, it will be replaced with the string "<输入文本>". If the input is from the clipboard, it will be replaced with the string "<剪贴板文本>".
{{x|y|z}} Placeholders

These placeholders are used when the input can come from multiple sources. The first available input from the list of sources (from left to right) will be used. For example, {{i|s|c}} means that the placeholder will be replaced with the query input if it's available; if not, it will use the selected text input; if that's also not available, it will use the clipboard input.
Usage in Actions

In the actions.json file, these placeholders are used in the content field of each action to specify where the input values should be inserted. For example, in the action with the content "你是一位资深的技术文档写作者，精通中文技术文档写作，掌握金字塔原理，谷歌写作课等各种写作技巧，应用这些技巧，帮我润色下面文本，包括逻辑、结构、语法、标点等，并给出对应的解释说明，按下面给出的格式输出：\n\n 输出格式：\n###优化版：\n<润色后的文本>\n\n###解释说明\n<解释说明>\n\n\n 要润色的文本：\n{{s}}", the {{s}} placeholder will be replaced with the selected text input when the action is executed.
Note

Please note that the actual replacement of these placeholders is handled by the contentFormat function in the src/contentFormat.ts file. This function takes the text with placeholders and a SpecificReplacements object that maps input types to their actual values, and returns the text with all placeholders replaced with their corresponding values or literal representations.
