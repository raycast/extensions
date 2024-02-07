import React, { useEffect, useRef, useState } from "react";
import { Author, Authors } from "./types";
import { cache, getAuthorsArrFromCache, KEY } from "./utils";
import { Form, Icon, ActionPanel, Action, Clipboard, showToast, Toast, popToRoot } from "@raycast/api";
import CreateOrEditCoAuthor from "./create-or-edit-co-author";

export default function ChooseAuthor() {
  const [authors, setAuthors] = useState<Authors>(getAuthorsArrFromCache());
  const [selectedAuthors, setCoAuthors] = useState<string[]>([]);
  const shouldGoBack = useRef(false);

  useEffect(() => {
    return cache.subscribe((key, data) => {
      if (key === KEY && data) {
        setAuthors(JSON.parse(data));
      }
    });
  }, []);

  return (
    <Form
      navigationTitle={"Select the Co-Authors you want to add"}
      actions={
        <ActionPanel>
          <Action
            title={"Copy to Clipboard"}
            icon={Icon.CopyClipboard}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => {
              shouldGoBack.current = true;

              const coAuthorCommitString = selectedAuthors.join("\n");

              Clipboard.copy(coAuthorCommitString).then(() => {
                showToast(Toast.Style.Success, "Copied to Clipboard").then(() => {
                  shouldGoBack.current = true;
                });
              });

              if (shouldGoBack.current) {
                popToRoot();
              }
            }}
          />
          <Action.Push
            title={"Add New CoAuthor"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            target={<CreateOrEditCoAuthor fromSelect={true} />}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        title={"Co-Authors"}
        id={"select-co-authors"}
        placeholder={"Select the Co-Authors"}
        onChange={(newValue: string[]) => {
          setCoAuthors(newValue);
        }}
      >
        {authors.map((value: Author) => {
          return (
            <Form.TagPicker.Item
              key={value.email}
              title={value.name}
              icon={Icon.Hashtag}
              value={`Co-Authored-By: ${value.name} <${value.email}>`}
            />
          );
        })}
      </Form.TagPicker>
    </Form>
  );
}
