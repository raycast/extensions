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
            showToast(Toast.Style.Failure, "Tags must start with # and directly follow the tag name.");
            return;
          }
          tags.push(tag);
        }
      }

      function formatReferences(references: string): string {
        if (!references) {
          return "";
        }

        const refs = references
          .split(/,|，|\n/)
          .map((ref) => ref.trim())
          .filter(Boolean);
        let formattedRefs = "\nReferences\n";
        refs.forEach((ref, index) => {
          formattedRefs += `[${index + 1}] ${ref}`;
          if (index !== refs.length - 1) {
            formattedRefs += "\n";
          }
        });
        return formattedRefs;
      }

      const references = formatReferences(values.reference);
      let content = values.content;
      if (values.tagPosition === "front" && tags.length > 0) {
        content = `${tags.join(" ")}\n${content}`;
      }

      if (references) {
        content += `\n${references}`;
      }

      if (values.tagPosition !== "front" && tags.length > 0) {
        content += `\n${tags.join(" ")}`;
      }

      try {
        const response = await fetch(apiKey, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        });

        if (response.ok) {
          showToast(Toast.Style.Success, "Successfully sent to Flomo!");
        } else {
          showToast(Toast.Style.Failure, "Send failed. Check API_KEY correctness in Raycast plugin settings.");
        }
      } catch (error) {
        showToast(Toast.Style.Failure, "Send failed. Check API_KEY correctness in Raycast plugin settings.");
      }
    },

    validation: {
      content: FormValidation.Required,
    },
  });

  const defaultTags = ["#Cmd+shift+enter->Modify.default.tag","#Leave.blank.to.not.display.preset","#Maximum.of.9.tag.preset", "", "", "", "", "", ""];

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
              showToast(Toast.Style.Failure, "Tags must start with # and directly follow the tag name.");
              return;
            }
          }
        }
        await LocalStorage.setItem(`tag${i}`, tag);
        setValue(`tag${i}` as keyof FlomoFormValues, tag);
      }
    }
    showToast(Toast.Style.Success, "Tag preset modification succeeded!");
    pop();
  };

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
        navigationTitle="Modify tag preset"
        actions={
          <ActionPanel>
            <Action title="Save" onAction={() => handleSubmit(values)} />
          </ActionPanel>
        }
      >
        <Form.TextField
          title="Preset tag 1"
          {...itemProps.tag1}
          id="tag1"
          placeholder="Enter tags with #, separated by spaces..."
          info="⚠️ Please note, there should be no space after the # in a tag. Spaces imply the start of a new tag.
⚠️ If an error occurs, please ensure that all preset tags that have been filled out are error-free."
        />
        <Form.TextField
          title="Preset tag 2"
          {...itemProps.tag2}
          id="tag2"
          placeholder="Enter tags with #, separated by spaces..."
        />
        <Form.TextField
          title="Preset tag 3"
          {...itemProps.tag3}
          id="tag3"
          placeholder="Enter tags with #, separated by spaces..."
        />
        <Form.TextField
          title="Preset tag 4"
          {...itemProps.tag4}
          id="tag4"
          placeholder="Enter tags with #, separated by spaces..."
        />
        <Form.TextField
          title="Preset tag 5"
          {...itemProps.tag5}
          id="tag5"
          placeholder="Enter tags with #, separated by spaces..."
        />
        <Form.TextField
          title="Preset tag 6"
          {...itemProps.tag6}
          id="tag6"
          placeholder="Enter tags with #, separated by spaces..."
        />
        <Form.TextField
          title="Preset tag 7"
          {...itemProps.tag7}
          id="tag7"
          placeholder="Enter tags with #, separated by spaces..."
        />
        <Form.TextField
          title="Preset tag 8"
          {...itemProps.tag8}
          id="tag8"
          placeholder="Enter tags with #, separated by spaces..."
        />
        <Form.TextField
          title="Preset tag 9"
          {...itemProps.tag9}
          id="tag9"
          placeholder="Enter tags with #, separated by spaces..."
        />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle="Send to flomo"
      actions={
        <ActionPanel>
          <Action title="Send" onAction={() => handleSubmit(values)} />
          <Action.Push title="Modify Default Tag Preset" target={<TagPresetsForm />} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Memo" {...itemProps.content} id="content" placeholder="Keep Noting, Meaning's Floating..." />
      {values.tag1 && <Form.Checkbox {...itemProps.tag1Checked} label={values.tag1} id="tag1Checked" />}
      {values.tag2 && <Form.Checkbox {...itemProps.tag2Checked} label={values.tag2} id="tag2Checked" />}
      {values.tag3 && <Form.Checkbox {...itemProps.tag3Checked} label={values.tag3} id="tag3Checked" />}
      {values.tag4 && <Form.Checkbox {...itemProps.tag4Checked} label={values.tag4} id="tag4Checked" />}
      {values.tag5 && <Form.Checkbox {...itemProps.tag5Checked} label={values.tag5} id="tag5Checked" />}
      {values.tag6 && <Form.Checkbox {...itemProps.tag6Checked} label={values.tag6} id="tag6Checked" />}
      {values.tag7 && <Form.Checkbox {...itemProps.tag7Checked} label={values.tag7} id="tag7Checked" />}
      {values.tag8 && <Form.Checkbox {...itemProps.tag8Checked} label={values.tag8} id="tag8Checked" />}
      {values.tag9 && <Form.Checkbox {...itemProps.tag9Checked} label={values.tag9} id="tag9Checked" />}
      <Form.TextArea title="Other tags" {...itemProps.tag10} id="tag10" placeholder="Other tags" info="Start with #, separated by space." />
      <Form.Dropdown title="Tag position" id="tagPosition" onChange={(value) => setValue("tagPosition", value)} storeValue>
        <Form.Dropdown.Item value="front" title="Tag at the front" />
        <Form.Dropdown.Item value="back" title="Tag at the back" />
      </Form.Dropdown>
      <Form.TextArea
        title="References"
        {...itemProps.reference}
        id="reference"
        placeholder="URLs"
        info="Use a comma (either in Chinese or English) or a new line to separate multiple links."
      />
    </Form>
  );
}
