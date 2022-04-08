import { ActionPanel, Action, Form, useNavigation, showToast, Toast, popToRoot } from "@raycast/api";
import { randomUUID } from "crypto";

import fs from "fs";
import { languages, path } from "../data";
import Search from "./Search";

const Editor = (props?: Item) => {
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(v) => {
              if (v.title === "" || v.prefix === "" || v.body === "") {
                showToast({
                  title: "error",
                  message: "title, prefix and body are required",
                  style: Toast.Style.Failure,
                });
              } else {
                const data = {
                  title: v.title,
                  prefix: v.prefix,
                  body: v.body.split("\n"),
                  description: v.description,
                  scope: v.language.join(),
                };
                if (fs.existsSync(path)) {
                  const obj = JSON.parse(fs.readFileSync(path).toString());
                  if (props && props.id) {
                    obj[props.id] = data;
                  } else {
                    obj[`raycast_${randomUUID()}`] = data;
                  }
                  fs.writeFileSync(path, JSON.stringify(obj));
                } else {
                  fs.writeFileSync(
                    path,
                    JSON.stringify({
                      [`raycast_${randomUUID()}`]: data,
                    })
                  );
                }
                push(<Search />);
              }
            }}
          ></Action.SubmitForm>
          <Action
            title="back"
            onAction={() => {
              popToRoot();
            }}
            shortcut={{ modifiers: [], key: "escape" }}
          ></Action>
        </ActionPanel>
      }
    >
      <Form.TagPicker id="language" title="language" defaultValue={props?.scope}>
        {languages.map((language) => {
          return <Form.TagPicker.Item key={language} title={language} value={language}></Form.TagPicker.Item>;
        })}
      </Form.TagPicker>
      <Form.TextField id="title" title="title" defaultValue={props?.title}></Form.TextField>
      <Form.TextField id="prefix" title="prefix" defaultValue={props?.prefix}></Form.TextField>
      <Form.TextField id="description" title="description" defaultValue={props?.description}></Form.TextField>
      <Form.TextArea id="body" title="body" defaultValue={props?.body}></Form.TextArea>
    </Form>
  );
};
export default Editor;
