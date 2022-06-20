import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { bunchInstalled, createBunchesByContent } from "./utils/common-utils";
import { BunchNotInstallView } from "./components/bunch-not-install-view";
import { ActionOpenFolder } from "./components/action-open-folder";
import { getBunchesPreview } from "./hooks/hooks-create-bunches";
import { bunchesShortcuts } from "./utils/constants";

export default function CreateBunch() {
  const [title, setTitle] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [shortcut, setShortcut] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const { bunchesPreview } = getBunchesPreview(title, tags, shortcut, content);
  const { pop } = useNavigation();
  return bunchInstalled() ? (
    <Form
      actions={
        <ActionPanel>
          <Action
            icon={Icon.TextDocument}
            title={"Create Bunch"}
            onAction={() => {
              createBunchesByContent(title, tags, content, bunchesPreview).then((result) => {
                if (result) pop();
              });
            }}
          />
          <Action
            icon={Icon.Trash}
            title={"Clear All Info"}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => {
              setTitle("");
              setTags("");
              setContent("");
            }}
          />
          <ActionOpenFolder />
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={Icon.List}
              title={"Quick Reference"}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "s" }}
              url={"https://bunchapp.co/docs/bunch-files/quick-reference/#quick-reference"}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"Title"}
        title={"Title"}
        placeholder={"Title"}
        value={title}
        info={"When detecting duplicate bunches, the file name case is ignored."}
        onChange={setTitle}
      />
      <Form.TextField
        id={"Tags"}
        title={"Tags"}
        value={tags}
        placeholder={"Tag (Optional)"}
        onChange={setTags}
        info={"Multiple tags can be combined using comma (,)\nExample: tag1,tag2"}
      />
      <Form.Dropdown id={"Shortcut"} title={"Shortcut"} value={shortcut} info={"Optional."} onChange={setShortcut}>
        {bunchesShortcuts.map((value) => {
          return <Form.DropdownItem key={value.value} value={value.value} title={value.title} />;
        })}
      </Form.Dropdown>
      <Form.TextArea
        id={"Content"}
        title={"Content"}
        placeholder={"Content"}
        value={content}
        info={"Find more bunches syntax via Quick Reference (action: ⌃+⇧+S)"}
        onChange={setContent}
      />
      <Form.Description title={"Preview"} text={bunchesPreview} />
    </Form>
  ) : (
    <List>
      <BunchNotInstallView extensionPreferences={false} />
    </List>
  );
}
