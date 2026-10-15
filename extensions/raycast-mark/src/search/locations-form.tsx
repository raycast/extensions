import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { t } from "../i18n.ts";
import {
  failureMessage,
  locationOptions,
  locationValue,
  parseLocationValue,
} from "../bookmark-form.tsx";
import { bookmarkMutation } from "../model.ts";
import type { Bookmark, LibraryState } from "../model.ts";
import { commit } from "../repository.ts";

export function LocationsForm({
  root,
  state,
  bookmark,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  bookmark: Bookmark;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const [values, setValues] = useState<string[]>(
    bookmark.locations.map(locationValue),
  );
  const options = locationOptions(state.catalog);
  return (
    <Form
      navigationTitle={t("管理分类位置")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("保存位置")}
            icon={Icon.Checkmark}
            onSubmit={async () => {
              if (!values.length) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("至少保留一个分类位置"),
                  message: t("如需移出所有分类，请使用“移入回收站”"),
                });
                return;
              }
              try {
                const result = await commit(root, {
                  mutations: [
                    bookmarkMutation(state, {
                      ...bookmark,
                      locations: values.map(parseLocationValue),
                      updatedAt: Date.now(),
                    }),
                  ],
                  expectedHeads: state.heads,
                });
                onSaved(result.state);
                await showToast({
                  style: Toast.Style.Success,
                  title: t("已更新分类位置"),
                  message: result.warning ?? bookmark.title,
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("未写入"),
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("书签")}
        text={`${bookmark.title}\n${bookmark.url}`}
      />
      <Form.TagPicker
        id="locations"
        title={t("分类位置（可多选）")}
        value={values}
        onChange={setValues}
        placeholder={t("选择或搜索分类")}
      >
        {options.map((option) => (
          <Form.TagPicker.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
