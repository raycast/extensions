/*
 * This is a flomo plugin, also an experiment by Lyson Ober, aimed at testing the performance of Cursor with GPT-4.
 * Test results:
 *      · It is not yet capable of completing complex tasks independently,
 *      · But there is a significant improvement after referencing the API documentation.
 *      · However, it still requires human intervention to debug and fix bugs,
 *      · so it is best to use it for learning APP development documentation at present.
 * Date: September 15, 2023
 */

import {
  ActionPanel,
  Form,
  showToast,
  Toast,
  Action,
  useNavigation,
  LocalStorage,
  getPreferenceValues,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import fetch from "node-fetch";
import { useEffect } from "react";

interface Preferences {
  apiKey: string;
}

interface FlomoFormValues {
  content: string;
  tag1: string;
  tag1Checked: boolean;
  tag2: string;
  tag2Checked: boolean;
  tag3: string;
  tag3Checked: boolean;
  tag4: string;
  tag4Checked: boolean;
  tag5: string;
  tag5Checked: boolean;
  tag6: string;
  tag6Checked: boolean;
  tag7: string;
  tag7Checked: boolean;
  tag8: string;
  tag8Checked: boolean;
  tag9: string;
  tag9Checked: boolean;
  tag10: string;
  tagPosition: string;
  reference: string;
}

export default function Command() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, setValue, values } = useForm<FlomoFormValues>({
    onSubmit: async (values) => {
      const preferences: Preferences = getPreferenceValues();
      const apiKey = preferences.apiKey;
      const tags = [];
      for (let i = 1; i <= 9; i++) {
        const tag = values[`tag${i}` as keyof FlomoFormValues];
        const isChecked = values[`tag${i}Checked` as keyof FlomoFormValues];
        if (isChecked) tags.push(tag);
      }

      if (values.tag10) {
        const userTags = values.tag10.split(" ").filter(Boolean);
        for (const tag of userTags) {
          if (!tag.startsWith("#")) {
            showToast(Toast.Style.Failure, "标签必须以#开头，并且紧跟标签名");
            return;
          }
          tags.push(tag);
        }
      }

      function formatReferences(references: string): string {
        const refs = references
          .split(/,|，|\n/)
          .map((ref) => ref.trim())
          .filter(Boolean);
        let formattedRefs = "\n参考资料\n";
        refs.forEach((ref, index) => {
          formattedRefs += `[${index + 1}] ${ref}\n`;
        });
        return formattedRefs;
      }

      const references = formatReferences(values.reference);
      const content =
        values.tagPosition === "front"
          ? `${tags.join(" ")}\n${values.content}\n${references}`
          : `${values.content} \n${tags.join(" ")}\n${references}`;
      const response = await fetch(apiKey, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        showToast(Toast.Style.Success, "成功发送到Flomo!");
      } else {
        showToast(Toast.Style.Failure, "发送失败");
      }
    },
    validation: {
      content: FormValidation.Required,
    },
  });

  const defaultTags = ["Cmd+shift+enter  修改默认标签｜留空不显示｜最多 9 个", "", "", "", "", "", "", "", ""];

  useEffect(() => {
    const fetchTagsAndPosition = async () => {
      for (let i = 1; i <= 9; i++) {
        const tag: string = (await LocalStorage.getItem(`tag${i}`)) || defaultTags[i - 1];
        setValue(`tag${i}` as keyof FlomoFormValues, tag);
      }
    };
    fetchTagsAndPosition();
  }, []);

  const handleSaveTagPresets = async (values: FlomoFormValues) => {
    for (let i = 1; i <= 9; i++) {
      let tag = values[`tag${i}` as keyof FlomoFormValues];
      if (typeof tag === "string") {
        tag = tag.trim();
        if (tag) {
          const tags = tag.split(" ");
          for (const t of tags) {
            if (!t.startsWith("#") || t.length === 1 || t[1] === " ") {
              showToast(Toast.Style.Failure, "标签必须以#开头，并且#后面必须有其他内容，内容不能为空格");
              return;
            }
          }
        }
        await LocalStorage.setItem(`tag${i}`, tag);
        setValue(`tag${i}` as keyof FlomoFormValues, tag);
      }
    }
    showToast(Toast.Style.Success, "标签预设修改成功!");
    pop();
  };

  // 定义一个新的组件来显示修改标签预设的表单
  function TagPresetsForm() {
    const { handleSubmit, itemProps, setValue, values } = useForm<FlomoFormValues>({
      onSubmit: handleSaveTagPresets,
    });

    useEffect(() => {
      const fetchTags = async () => {
        for (let i = 1; i <= 9; i++) {
          const tag: string = (await LocalStorage.getItem(`tag${i}`)) || defaultTags[i - 1];
          setValue(`tag${i}` as keyof FlomoFormValues, tag);
        }
      };
      fetchTags();
    }, []);

    return (
      // 子表单
      <Form
        navigationTitle="修改标签预设"
        actions={
          <ActionPanel>
            <Action title="保存" onAction={() => handleSubmit(values)} />
          </ActionPanel>
        }
      >
        <Form.TextField
          title="预设标签1"
          {...itemProps.tag1}
          id="tag1"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签2"
          {...itemProps.tag2}
          id="tag2"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签3"
          {...itemProps.tag3}
          id="tag3"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签4"
          {...itemProps.tag4}
          id="tag4"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签5"
          {...itemProps.tag5}
          id="tag5"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签6"
          {...itemProps.tag6}
          id="tag6"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签7"
          {...itemProps.tag7}
          id="tag7"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签8"
          {...itemProps.tag8}
          id="tag8"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
        <Form.TextField
          title="预设标签9"
          {...itemProps.tag9}
          id="tag9"
          placeholder="请输入标签或标签组，多标签用空格分隔…"
        />
      </Form>
    );
  }

  return (
    // 主表单
    <Form
      navigationTitle="发送到Flomo"
      actions={
        <ActionPanel>
          <Action title="发送" onAction={() => handleSubmit(values)} />
          <Action.Push title="修改标签预设" target={<TagPresetsForm />} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="笔记内容" {...itemProps.content} id="content" placeholder="持续不断记录，意义自然浮现…" />
      {values.tag1 && <Form.Checkbox {...itemProps.tag1Checked} label={values.tag1} id="tag1Checked" />}
      {values.tag2 && <Form.Checkbox {...itemProps.tag2Checked} label={values.tag2} id="tag2Checked" />}
      {values.tag3 && <Form.Checkbox {...itemProps.tag3Checked} label={values.tag3} id="tag3Checked" />}
      {values.tag4 && <Form.Checkbox {...itemProps.tag4Checked} label={values.tag4} id="tag4Checked" />}
      {values.tag5 && <Form.Checkbox {...itemProps.tag5Checked} label={values.tag5} id="tag5Checked" />}
      {values.tag6 && <Form.Checkbox {...itemProps.tag6Checked} label={values.tag6} id="tag6Checked" />}
      {values.tag7 && <Form.Checkbox {...itemProps.tag7Checked} label={values.tag7} id="tag7Checked" />}
      {values.tag8 && <Form.Checkbox {...itemProps.tag8Checked} label={values.tag8} id="tag8Checked" />}
      {values.tag9 && <Form.Checkbox {...itemProps.tag9Checked} label={values.tag9} id="tag9Checked" />}
      <Form.TextArea title="其他标签" {...itemProps.tag10} id="tag10" placeholder="Other tags" info="#开头，空格分隔" />
      <Form.Dropdown title="标签位置" {...itemProps.tagPosition}>
        <Form.Dropdown.Item value="front" title="tag在前" />
        <Form.Dropdown.Item value="back" title="tag在后" />
      </Form.Dropdown>
      <Form.TextArea
        title="参考资料"
        {...itemProps.reference}
        id="reference"
        placeholder="URLs"
        info="逗号（中英皆可）或换行来分隔多个链接"
      />
    </Form>
  );
}
