import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import * as fs from "fs-extra";

type Values = {
  inPath: string;
  outPath: string;
  extName: string;
  // datepicker: Date;
  // checkbox: boolean;
  dropdown: string;
  // tokeneditor: string[];
};

function dirs(dirPath: string, output: (value: string) => void) {
  fs.readdir(dirPath, function (err, files) {
    if (err) {
      return console.log("err" + err);
    }

    files.forEach(function (f: string) {
      try {
        const stat = fs.lstatSync(dirPath + "/" + f);
        if (stat.isDirectory()) {
          dirs(dirPath + "/" + f, output);
        } else {
          const file = dirPath + "/" + f;
          output(file);
        }
      } catch (error) {
        console.log(error);
      }
    });
  });
}

export default function Command() {
  function handleSubmit(values: Values) {
    console.log(values);
    switch (values.dropdown) {
      case "merge-file-text-item":
        dirs(values.inPath, function (file: string) {
          if (file.endsWith(values.extName)) {
            const data = fs.readFileSync(file, "utf8");
            fs.appendFile(values.outPath + "/output.txt", data);
            console.log("合并文件到output:" + file);
          }
        });
        showToast({
          title: "合并成功",
          message: "查看:" + values.outPath + "/output.txt",
        });
        break;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="提交" />
        </ActionPanel>
      }
    >
      {/* <Form.Description text="This form showcases all available form elements." /> */}
      <Form.TextField
        id="inPath"
        title="输入目录"
        placeholder="输入文件的目录"
      />
      <Form.TextField
        id="extName"
        title="文件类型"
        placeholder=".java"
        defaultValue=".java"
      />
      <Form.TextField
        id="outPath"
        title="输出目录"
        placeholder="输出文件的目录"
      />
      {/* <Form.TextArea id="textarea" title="Text area" placeholder="Enter multi-line text" /> */}
      <Form.Separator />
      {/* <Form.DatePicker id="datepicker" title="Date picker" /> */}
      {/* <Form.Checkbox id="checkbox" title="Checkbox" label="Checkbox Label" storeValue /> */}
      <Form.Dropdown id="dropdown" title="选择功能">
        <Form.Dropdown.Item
          value="merge-file-text-item"
          title="合并所有文件内容到一个文件"
        />
      </Form.Dropdown>
      {/* <Form.TagPicker id="tokeneditor" title="Tag picker">
        <Form.TagPicker.Item value="tagpicker-item" title="Tag Picker Item" />
      </Form.TagPicker> */}
    </Form>
  );
}
