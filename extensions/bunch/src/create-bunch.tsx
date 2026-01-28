import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { bunchInstalled, createBunchesByContent, isEmpty } from "./utils/common-utils";
import { BunchNotInstallView } from "./components/bunch-not-install-view";
import { ActionOpenFolder } from "./components/action-open-folder";
import { getBunchesPreview } from "./hooks/hooks-create-bunches";
import { bunchesShortcuts } from "./utils/constants";
import { ActionOpenSyntaxReference } from "./components/action-open-syntax-reference";
import SearchBunchReferences from "./search-bunch-references";

export default function CreateBunch() {
  const [title, setTitle] = useState<string>("");
  const [titleError, setTitleError] = useState<string | undefined>();
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
              if (isEmpty(title)) {
                setTitleError("The field should't be empty!");
                return false;
              }
              createBunchesByContent(title, tags, content, bunchesPreview).then((result) => {
                if (result) pop();
              });
            }}
          />
          <Action.Push
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            title={"Quick Reference"}
            target={<SearchBunchReferences isPopup={true} />}
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
            <ActionOpenSyntaxReference />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id={"Title"}
        title={"Title"}
        placeholder={"Title"}
        value={title}
        error={titleError}
        info={"When detecting duplicate bunches, the file name case is ignored."}
        onChange={(newValue) => {
          setTitle(newValue);
          if (newValue.length > 0) {
            setTitleError(undefined);
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setTitleError("The field should't be empty!");
          } else {
            setTitleError(undefined);
          }
        }}
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
