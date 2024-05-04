import { Form, Detail, ActionPanel, Action, showToast, Toast, open, popToRoot } from "@raycast/api";
import { useState } from "react";
import { MemoInfoResponse, PostFileResponse, PostMemoParams, ResponseData } from "./types";
import { getOriginUrl, getRequestUrl, getTags, postFile, sendMemo } from "./api";
import { VISIBILITY } from "./constant";

interface FormData {
  content: string;
  files: string[];
  tags: string[];
  visibility: keyof typeof VISIBILITY;
}

export default function SendMemoFormCommand(): JSX.Element {
  const { isLoading, data: existTags } = getTags();

  const [nameError, setNameError] = useState<string | undefined>();
  const [files, setFiles] = useState<string[]>([]);
  const [createdMarkdown, setCreatedMarkdown] = useState<string>();
  const [createdUrl, setCreatedUrl] = useState<string>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function computedCreatedUrl(data: MemoInfoResponse) {
    const { name, id } = data;
    const url = getRequestUrl(`/m/${name || id}`);

    setCreatedUrl(url);
  }

  function computedCreatedMarkdown(data: MemoInfoResponse) {
    const { content, resourceList } = data;
    let markdown = content;

    resourceList.forEach((resource, index) => {
      const resourceUrl = getRequestUrl(`/o/r/${resource.id}?thumbnail=1`);

      if (index === 0) {
        markdown += "\n\n";
      }

      markdown += ` ![${resource.filename}](${resourceUrl})`;
    });

    setCreatedMarkdown(markdown);
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

    if (files.length) {
      showToast({
        style: Toast.Style.Animated,
        title: "Upload Files",
      });

      const postFilesPromiseArr: Promise<ResponseData<PostFileResponse> & PostFileResponse>[] = [];

      files.forEach((file) => {
        postFilesPromiseArr.push(postFile(file));
      });

      const uploadedFiles = await Promise.all(postFilesPromiseArr).catch(() => {
        showToast(Toast.Style.Failure, "Upload Files Failed");
      });

      if (uploadedFiles) {
        params.resourceIdList = uploadedFiles.map((file) => file.id || file.data.id);
      }
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Sending Memo",
    });

    const res = await sendMemo(params).catch(() => {
      showToast(Toast.Style.Failure, "Send Memo Failed");
    });

    if (res) {
      showToast(Toast.Style.Success, "Send Memo Success");
      computedCreatedMarkdown(res.data || res);
      computedCreatedUrl(res.data || res);

      setTimeout(() => {
        popToRoot({ clearSearchBar: true });
      }, 5000);
    }
  };

  function openWeb() {
    open(createdUrl || getOriginUrl());
    popToRoot({ clearSearchBar: true });
  }

  return createdMarkdown ? (
    <Detail
      markdown={createdMarkdown}
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

      <Form.TagPicker id="tags" title="Exist Tags">
        {(existTags?.data || existTags)?.map((tag) => {
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
