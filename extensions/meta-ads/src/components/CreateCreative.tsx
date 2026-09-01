import { Action, ActionPanel, Clipboard, Form, Icon, Toast, confirmAlert, popToRoot, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { existsSync, lstatSync } from "fs";
import { useState } from "react";
import { MissingCredentialsForm, useCredentialsGuard } from "./MissingCredentials";
import { CALL_TO_ACTIONS } from "../lib/fields";
import {
  createCreative,
  listResource,
  previewCreativeCommand,
  serializeFormValue,
  type CreativeCreateInput,
} from "../lib/cli";

function firstExistingFile(paths: unknown): string | undefined {
  if (!Array.isArray(paths)) return undefined;
  return paths.find((path) => typeof path === "string" && existsSync(path) && lstatSync(path).isFile());
}

function existingFiles(paths: unknown): string[] {
  if (!Array.isArray(paths)) return [];
  return paths.filter(
    (path): path is string => typeof path === "string" && existsSync(path) && lstatSync(path).isFile(),
  );
}

function splitLines(value: unknown): string[] {
  return serializeFormValue(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function CreateCreative() {
  const { isReady, isLoading: credsLoading, credentials } = useCredentialsGuard();
  const pagesQuery = useCachedPromise(async () => listResource("page"), [], { execute: isReady });
  const [dco, setDco] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [pageMode, setPageMode] = useState("list");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pages = pagesQuery.data ?? [];

  async function handleSubmit(values: Record<string, unknown>) {
    const name = serializeFormValue(values.name);
    const pageId = serializeFormValue(values.page_id) || credentials?.pageId || "";
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "크리에이티브 이름을 입력하세요" });
      return;
    }
    if (!pageId) {
      await showToast({ style: Toast.Style.Failure, title: "Page ID가 필요합니다" });
      return;
    }

    const input: CreativeCreateInput = {
      name,
      pageId,
      instagramActorId: serializeFormValue(values.instagram_actor_id) || undefined,
    };

    if (dco) {
      input.images = existingFiles(values.images);
      input.videos = existingFiles(values.videos);
      input.titles = splitLines(values.titles);
      input.bodies = splitLines(values.bodies);
      input.descriptions = splitLines(values.descriptions);
      input.callToActions = Array.isArray(values.call_to_actions)
        ? (values.call_to_actions as string[]).filter(Boolean)
        : [];
      input.linkUrl = serializeFormValue(values.link_url) || undefined;
      if (!input.images?.length && !input.videos?.length) {
        await showToast({ style: Toast.Style.Failure, title: "DCO는 이미지 또는 영상이 필요합니다" });
        return;
      }
    } else {
      if (mediaType === "image") {
        input.image = firstExistingFile(values.image);
        if (!input.image) {
          await showToast({ style: Toast.Style.Failure, title: "이미지 파일을 선택하세요" });
          return;
        }
      } else {
        input.video = firstExistingFile(values.video);
        if (!input.video) {
          await showToast({ style: Toast.Style.Failure, title: "영상 파일을 선택하세요" });
          return;
        }
      }
      input.body = serializeFormValue(values.body) || undefined;
      input.title = serializeFormValue(values.title) || undefined;
      input.linkUrl = serializeFormValue(values.link_url) || undefined;
      input.description = serializeFormValue(values.description) || undefined;
      input.callToAction = serializeFormValue(values.call_to_action) || undefined;
    }

    const confirmed = await confirmAlert({
      title: "크리에이티브를 만들까요?",
      message: previewCreativeCommand(input),
      primaryAction: { title: "만들기" },
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "업로드 및 생성 중" });
    try {
      const result = await createCreative(input);
      toast.style = Toast.Style.Success;
      toast.title = "생성 완료";
      toast.message = result.id ? `ID ${result.id} (복사됨)` : result.raw.slice(0, 200);
      if (result.id) await Clipboard.copy(result.id);
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "생성 실패";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (credsLoading) return <Form isLoading />;
  if (!isReady) return <MissingCredentialsForm />;

  return (
    <Form
      isLoading={pagesQuery.isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="크리에이티브 만들기" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="이름" placeholder="예: 히어로 배너" />
      <Form.Dropdown id="page_mode" title="페이지 선택" value={pageMode} onChange={setPageMode}>
        {pages.length > 0 ? <Form.Dropdown.Item value="list" title="목록에서 선택" /> : null}
        <Form.Dropdown.Item value="manual" title="ID 직접 입력" />
      </Form.Dropdown>
      {pageMode === "list" && pages.length > 0 ? (
        <Form.Dropdown id="page_id" title="페이지" defaultValue={credentials?.pageId}>
          {pages.map((page) => (
            <Form.Dropdown.Item key={page.id} value={page.id} title={`${page.name || page.id} (${page.id})`} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="page_id"
          title="Page ID"
          defaultValue={credentials?.pageId}
          placeholder="Facebook Page ID"
        />
      )}

      <Form.Checkbox
        id="dco"
        label="Dynamic Creative Optimization"
        title="DCO"
        value={dco}
        onChange={setDco}
        info="이미지/카피 여러 개를 넣고 Meta가 조합을 테스트합니다"
      />

      {dco ? (
        <>
          <Form.FilePicker
            id="images"
            title="이미지"
            allowMultipleSelection
            canChooseDirectories={false}
            info="최대 10개. jpg, png, gif, webp"
          />
          <Form.FilePicker
            id="videos"
            title="영상"
            allowMultipleSelection
            canChooseDirectories={false}
            info="최대 10개. mp4, mov, avi, mkv, wmv"
          />
          <Form.TextField
            id="link_url"
            title="도착 URL"
            placeholder="https://example.com"
            info="DCO는 URL이 필요합니다"
          />
          <Form.TextArea id="titles" title="헤드라인" placeholder={"한 줄에 하나\n최대 5개"} />
          <Form.TextArea id="bodies" title="본문" placeholder={"한 줄에 하나\n최대 5개"} />
          <Form.TextArea id="descriptions" title="설명" placeholder={"한 줄에 하나\n최대 5개"} />
          <Form.TagPicker id="call_to_actions" title="CTA" info="최대 5개">
            {CALL_TO_ACTIONS.map((cta) => (
              <Form.TagPicker.Item key={cta.value} value={cta.value} title={cta.title} />
            ))}
          </Form.TagPicker>
        </>
      ) : (
        <>
          <Form.Dropdown
            id="media_type"
            title="미디어"
            value={mediaType}
            onChange={(value) => setMediaType(value as "image" | "video")}
          >
            <Form.Dropdown.Item value="image" title="이미지" icon={Icon.Image} />
            <Form.Dropdown.Item value="video" title="영상" icon={Icon.Video} />
          </Form.Dropdown>
          {mediaType === "image" ? (
            <Form.FilePicker
              id="image"
              title="이미지 파일"
              allowMultipleSelection={false}
              canChooseDirectories={false}
              info="jpg, jpeg, png, gif, bmp, webp"
            />
          ) : (
            <Form.FilePicker
              id="video"
              title="영상 파일"
              allowMultipleSelection={false}
              canChooseDirectories={false}
              info="mp4, mov, avi, mkv, wmv"
            />
          )}
          <Form.TextArea id="body" title="본문" placeholder="광고 문구" />
          <Form.TextField id="title" title="헤드라인" />
          <Form.TextField id="link_url" title="도착 URL" placeholder="https://example.com" />
          <Form.TextField id="description" title="설명" />
          <Form.Dropdown id="call_to_action" title="CTA">
            <Form.Dropdown.Item value="" title="선택 안 함" />
            {CALL_TO_ACTIONS.map((cta) => (
              <Form.Dropdown.Item key={cta.value} value={cta.value} title={cta.title} />
            ))}
          </Form.Dropdown>
        </>
      )}

      <Form.TextField id="instagram_actor_id" title="Instagram 계정 ID" placeholder="선택" />
    </Form>
  );
}
