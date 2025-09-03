import { Form, Detail, ActionPanel, Action, showToast, Toast, open, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { MemoInfoResponse, PostFileResponse, PostMemoParams } from "./types";
import {
  getMemoByName,
  getOriginUrl,
  getRecentTags,
  getRequestUrl,
  getAttachmentBinToBase64,
  postFile,
  postMemoAttachments,
  sendMemo,
} from "./api";
import { VISIBILITY } from "./constant";
import { showFailureToast } from "@raycast/utils";

interface FormData {
  content: string;
  files: string[];
  tags: string[];
  visibility: keyof typeof VISIBILITY;
}

export default function SendMemoFormCommand(): JSX.Element {
  const [nameError, setNameError] = useState<string>();
  const [files, setFiles] = useState<string[]>([]);
  const [createdMarkdown, setCreatedMarkdown] = useState<string>();
  const [createdUrl, setCreatedUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [recentTags, setRecentTags] = useState<string[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    getRecentTags()
      .then((tags) => {
        setRecentTags(tags);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function computedCreatedUrl(data: MemoInfoResponse) {
    const { name } = data;
    const url = getRequestUrl(`/${name}`);

    setCreatedUrl(url);
  }

  async function computedCreatedMarkdown(data: MemoInfoResponse) {
    setCreatedMarkdown(data.content);
    setLoadingDetail(true);

    try {
      const memoData = await getMemoByName(data.name);

      const { content, attachments } = memoData;
      let markdown = content;

      for (const resource of attachments) {
        const resourceUrl = await getAttachmentBinToBase64(resource.name, resource.filename);
        console.log("resourceUrl", resourceUrl);
        markdown += `\n\n ![${resource.filename}](${resourceUrl})`;
      }

      setCreatedMarkdown(markdown);
    } catch (error) {
      showFailureToast(error, { title: "Failed to fetch memo details" });
    }

    setLoadingDetail(false);
    setTimeout(() => {
      popToRoot({ clearSearchBar: true });
    }, 5000);
  }

  const onSubmit = async (values: FormData) => {
    const { content, files, tags, visibility } = values;

    const params = {
      content,
      visibility,
    } as PostMemoParams;

    if (tags?.length) {
      params.content += ` #${tags.join(" #")}`;
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Sending Memo",
    });

    const res = await sendMemo(params).catch(() => {
      showToast(Toast.Style.Failure, "Send Memo Failed");
    });

    console.log("res", res);

    if (res?.name) {
      if (files.length) {
        await setMemoResource(res, files);
      }

      showToast(Toast.Style.Success, "Send Memo Success");
      computedCreatedUrl(res);
      computedCreatedMarkdown(res);
    }
  };

  const setMemoResource = async (memos: MemoInfoResponse, files: string[]) => {
    if (files.length) {
      showToast({
        style: Toast.Style.Animated,
        title: "Upload Files",
      });
      const postFilesPromiseArr: Promise<PostFileResponse>[] = [];

      files.forEach((file) => {
        const filename = file.split("/").pop() || "";
        postFilesPromiseArr.push(postFile(file, filename));
      });

      const uploadedFiles = await Promise.all(postFilesPromiseArr).catch(() => {
        showToast(Toast.Style.Failure, "Upload Files Failed");
      });

      if (uploadedFiles) {
        await postMemoAttachments(memos.name, uploadedFiles).catch((err) => {
          showToast(Toast.Style.Failure, `Upload Files Failed. ${err?.message}`);
          throw new Error(err);
        });
      }
    }
  };

  function openWeb() {
    open(createdUrl || getOriginUrl());
    popToRoot({ clearSearchBar: true });
  }

  return createdMarkdown ? (
    <Detail
      markdown={createdMarkdown}
      isLoading={loadingDetail}
      actions={
        createdUrl && (
          <ActionPanel>
            <Action title="Open in Browser" onAction={openWeb} />
          </ActionPanel>
        )
      }
    />
  ) : (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Enter Content"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />

      <Form.FilePicker id="files" value={files} onChange={setFiles} />

      <Form.TagPicker id="tags" title="Recent Tags">
        {recentTags.map((tag) => {
          return <Form.TagPicker.Item key={tag} value={tag} title={tag} />;
        })}
      </Form.TagPicker>

      <Form.Dropdown id="visibility" title="Limit" defaultValue="PRIVATE">
        {Object.keys(VISIBILITY).map((key) => {
          return <Form.Dropdown.Item key={key} value={key} title={VISIBILITY[key as keyof typeof VISIBILITY]} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
