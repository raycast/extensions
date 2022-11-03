/*
 * @author: tisfeng
 * @createTime: 2022-06-30 00:23
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-11 21:27
 * @fileName: index.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Action, ActionPanel, Clipboard, closeMainWindow, getSelectedText, Icon, List, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";

export default function () {
  const [inputText, setInputText] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("");

  useEffect(() => {
    if (!markdown) {
      tryQuerySelecedtText();
    }
  }, [markdown]);

  function tryQuerySelecedtText() {
    getSelectedText()
      .then((selectedText) => {
        console.log("selectedText:\n", selectedText);
        setMarkdown(selectedText.trim());
      })
      .catch(() => {
        // do nothing
      });
  }

  /**
   *  Set or modify the programming language in markdown code blocks in batch.
   *
   * @return new code with language
   */
  function setCodeBlockLanguage(code: string, newLanguage: string) {
    // console.log(`code:\n ${code}`);
    const lines = code.split("\n");
    const codeBlockSymbol = "```";
    let index = 0;
    const newLines = lines.map((line) => {
      // console.log(`line: ${line}`);
      if (line.trim().startsWith(codeBlockSymbol)) {
        index += 1;
        if (index % 2 === 1) {
          const [startSymbol, originalLanguage] = line.split(codeBlockSymbol);
          if (originalLanguage.length > 0) {
            // console.log(`originalLanguage > 0: ${originalLanguage}`);
            const replacedLanguage = originalLanguage.replace(originalLanguage, `${newLanguage}`);
            return `${startSymbol}${codeBlockSymbol}${replacedLanguage}`;
          } else {
            // console.log(`originalLanguage is empty`);
            return line + newLanguage;
          }
        } else {
          return line;
        }
      } else {
        return line;
      }
    });
    const newCode = newLines.join("\n");
    // console.log(`---> newCode:\n ${newCode}`);
    return newCode;
  }

  /**
   * Check markdown has code block
   */
  function checkHasCodeBlock(markdown: string) {
    if (markdown === undefined) {
      return false;
    }

    const lines = markdown.split("\n");
    const codeBlockSymbol = "```";
    for (const line of lines) {
      if (line.trim().startsWith(codeBlockSymbol)) {
        return true;
      }
    }
    return false;
  }

  const hasCodeBlock = checkHasCodeBlock(markdown);
  /**
   * Show list empty view according to hasCodeBlock
   */
  const showListEmptyView = () => {
    if (hasCodeBlock) {
      return <List.EmptyView icon={Icon.Checkmark} title="Ok, ready to set the language." />;
    } else {
      return <List.EmptyView icon={Icon.ExclamationMark} title="Please select the markdown code blocks first!" />;
    }
  };
  const actionTitle = inputText.length > 0 ? `Set Language: ${inputText}` : `Set Language`;

  const onInputChangeEvent = (inputText: string) => {
    setInputText(inputText);
  };

  return (
    <List
      isShowingDetail={false}
      searchBarPlaceholder={"Type a language..."}
      searchText={inputText}
      onSearchTextChange={onInputChangeEvent}
      actions={
        hasCodeBlock && (
          <ActionPanel>
            <Action
              title={actionTitle}
              onAction={() => {
                const newCode = setCodeBlockLanguage(markdown, inputText);
                Clipboard.paste(newCode);
                closeMainWindow();
                popToRoot();
              }}
            />
          </ActionPanel>
        )
      }
    >
      {showListEmptyView()}
    </List>
  );
}

/**
 * Test code block:

```js
let a = 0;
let b = 1;
let c = a + b;
```

```js
function test() {
  console.log("notice the blank line before this function?");
}
```
 */
