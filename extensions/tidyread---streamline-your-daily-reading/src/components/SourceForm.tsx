import { Action, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { Source } from "../types";
import { useForm, usePromise } from "@raycast/utils";
import { isURL } from "../utils/util";
import { CATEGORIES } from "../const";
import { getSources, saveSources } from "../store";
import { fetchMetadata, isValidRSSLink } from "../utils/request";
import CustomActionPanel from "./CustomActionPanel";

export default function ReadForm(props: { id?: string; navigationTitle?: string; onSuccess?: () => Promise<void> }) {
  const { id, ...otherProps } = props;
  const { isLoading, data: sources } = usePromise(getSources);

  if (!id) {
    return <InnerReadForm {...otherProps} />;
  }

  if (!isLoading && sources) {
    const targetItem = sources.find((item) => item.id === id);
    return <InnerReadForm defaultValues={targetItem} {...otherProps} />;
  }

  return null;
}

function InnerReadForm(props: { defaultValues?: Source; navigationTitle?: string; onSuccess?: () => Promise<void> }) {
  const { defaultValues, navigationTitle, onSuccess } = props;
  const { pop } = useNavigation();
  const id = defaultValues?.id;
  // useForm 的favicon没有实体表单项，onSubmit的值里面取不到，所以需要单独维护状态
  const [favicon, setFavicon] = useState("");

  const { handleSubmit, itemProps, setValue, values } = useForm<Source>({
    // 如果编辑用setValue赋值，可能会遇到两个坑：
    // 1. 必须setTimeout
    // 2. dropdown赋值后，没法改变
    initialValues: {
      url: defaultValues?.url ?? "",
      title: defaultValues?.title ?? "",
      favicon: defaultValues?.favicon ?? "",
      schedule: defaultValues?.schedule ?? "everyday",
      customDays: defaultValues?.customDays ?? [],
      rssLink: defaultValues?.rssLink ?? "",
      timeSpan: defaultValues?.timeSpan ?? "1",
      tags: defaultValues?.tags ?? [],
    },
    async onSubmit(values) {
      const newReadItem = { ...values, id: id ?? `${Date.now()}` };

      try {
        // 且跟进入时发生了变化，才需要验证
        if (values.rssLink && values.rssLink !== defaultValues?.rssLink) {
          showToast(Toast.Style.Animated, "Validating RSS Link");
          try {
            const isValid = await isValidRSSLink(values.rssLink);
            if (!isValid) {
              showToast(Toast.Style.Failure, "Invalid RSS Link");
              return;
            }
          } catch (err: any) {
            showToast(Toast.Style.Failure, "Failed To Fetch RSS Link", err.message);
            return;
          }
        }

        const sources = await getSources();

        if (id) {
          const index = sources.findIndex((item) => item.id === id);
          sources[index] = { ...sources[index], ...newReadItem };
        } else {
          sources.push({ ...newReadItem, favicon });
        }

        saveSources(sources);
        showToast(Toast.Style.Success, `Source ${id ? "updated" : "added"}`);
        await onSuccess?.();
        pop();
      } catch (error: any) {
        showToast(Toast.Style.Failure, error.message);
      }
    },
    validation: {
      url: (value) => (!value || !isURL(value) ? "A valid URL is required" : undefined),
      title: (value) => (!value ? "Title is required" : undefined),
      customDays: (value) => {
        if (values.schedule === "custom" && value?.length === 0) {
          return "Custom days are required";
        }
      },
      timeSpan: (value) => {
        if (values.rssLink) {
          if (!value) {
            return "Required";
          }

          if (isNaN(+value!)) {
            return "Should be a number";
          }

          if (+value! < 1 || +value! > 7) {
            return "Should be between 1 and 7";
          }
        }
      },
    },
  });

  useEffect(() => {
    async function fetchAndSetMetadata() {
      // 只有url存在且为URL格式，且是新建状态，才需要fetch metadata
      if (isURL(values.url) && !id) {
        try {
          showToast(Toast.Style.Animated, "Fetching URL metadata...");
          const metadata = await fetchMetadata(values.url);
          showToast(Toast.Style.Success, "Fetching success");
          setValue("title", metadata.title);
          setFavicon(metadata.favicon);
        } catch (error: any) {
          showToast(Toast.Style.Failure, "Failed to fetch metadata", error.message);
        }
      }
    }

    fetchAndSetMetadata();
  }, [values.url, id]);

  return (
    <Form
      searchBarAccessory={<Form.LinkAccessory target="https://tidyread.info/docs/where-to-find-rss" text="Find RSS" />}
      actions={
        <CustomActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title="Save Source" onSubmit={handleSubmit} />
        </CustomActionPanel>
      }
      navigationTitle={navigationTitle}
    >
      <Form.TextField {...itemProps.url} title="URL" placeholder="Enter URL here" />
      <Form.TextField {...itemProps.title} title="Title" placeholder="Title will be fetched from URL" />
      {/* @ts-ignore */}
      <Form.Dropdown {...itemProps.schedule} title="Schedule">
        <Form.Dropdown.Item value="custom" title="Custom" />
        <Form.Dropdown.Item value="everyday" title="Everyday" />
      </Form.Dropdown>
      {values.schedule === "custom" && (
        <Form.TagPicker {...itemProps.customDays} title="Custom Days">
          <Form.TagPicker.Item value="Monday" title="Monday" />
          <Form.TagPicker.Item value="Tuesday" title="Tuesday" />
          <Form.TagPicker.Item value="Wednesday" title="Wednesday" />
          <Form.TagPicker.Item value="Thursday" title="Thursday" />
          <Form.TagPicker.Item value="Friday" title="Friday" />
          <Form.TagPicker.Item value="Saturday" title="Saturday" />
          <Form.TagPicker.Item value="Sunday" title="Sunday" />
        </Form.TagPicker>
      )}
      <Form.TextField
        {...itemProps.rssLink}
        title="RSS Link"
        placeholder="Enter RSS link (optional)"
        info="Used for generate digest, you can learn how to find rss through the documentation in the upper right corner"
      />
      {!!values.rssLink && (
        <Form.TextField
          {...itemProps.timeSpan}
          title="Time Span"
          placeholder="Time span of the content pulled by rss"
          info="Time span of the content pulled by rss, e.g.: 1 means 1 day. Maximum 7 days, minimum 1 day."
        />
      )}
      <Form.TagPicker {...itemProps.tags} title="Tags" placeholder="Select tags (optional)">
        {CATEGORIES.map((category) => (
          <Form.TagPicker.Item key={category} value={category} title={category} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
