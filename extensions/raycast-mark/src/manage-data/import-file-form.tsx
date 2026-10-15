import { useRef, useState } from "react";
import { portableLibrary } from "../shared-json-storage.ts";
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
import { failureMessage } from "../bookmark-form.tsx";
import { previewJsonImport } from "../import-export.ts";

import type { LibraryState } from "../model.ts";
import { ImportPreview } from "./import-preview.tsx";

export function ImportFileForm({
  root,
  state,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
}) {
  const { push } = useNavigation();
  const previewing = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  async function previewFile(picked?: string) {
    if (previewing.current) return;
    if (!picked) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("请选择共享数据文件夹"),
      });
      return;
    }
    previewing.current = true;
    setIsLoading(true);
    try {
      const input = await portableLibrary.readBookmarks(picked);
      const text = JSON.stringify(input.document);
      const plan = previewJsonImport(text, state, { folder: true });
      push(<ImportPreview root={root} plan={plan} onSaved={onSaved} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("预览失败"),
        message: failureMessage(error),
      });
    } finally {
      previewing.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={t("导入数据文件夹")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("预览导入")}
            icon={Icon.Download}
            onSubmit={(values: Form.Values) =>
              previewFile((values.file as string[] | undefined)?.[0])
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("接受的格式")}
        text={t(
          "数据文件夹包含 bookmarks.json 与 assets/icons；图片一起读取，确认后合并到本地库。",
        )}
      />
      <Form.FilePicker
        id="file"
        title={t("数据文件夹")}
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection={false}
        onChange={(files) => {
          if (files[0]) void previewFile(files[0]);
        }}
      />
    </Form>
  );
}
