import { List } from "@raycast/api";
import { useMemo } from "react";
import { RouterOutputs } from "../utils/trpc.util";
import { qrSvgDataUri } from "../utils/qr.util";

type Bookmark = RouterOutputs["bookmark"]["listAll"][number];
type Me = RouterOutputs["user"]["me"];

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

// 북마크 우측 상세 패널. QR 코드는 URL을 sync로 SVG 생성해 markdown에 임베드.
// Note: "updated by" 는 현재 DB에 저장되지 않아 시간만 표시한다.
export function BookmarkItemDetail({ bookmark, me }: { bookmark: Bookmark; me?: Me }) {
  const qrUri = useMemo(() => qrSvgDataUri(bookmark.url), [bookmark.url]);
  const space = me?.associatedSpaces.find((s) => s.id === bookmark.spaceId);

  // 제목은 List.Item의 title로 이미 좌측에 노출되므로 마크다운에는 중복 표기하지 않는다.
  // Description은 긴 텍스트일 수 있어 Metadata.Label(단일 라인, ... 축약)이 아닌
  // 마크다운 하단(QR 아래)에 두어 자연스럽게 줄바꿈되도록 한다.
  const markdown = [qrUri ? `![QR Code](${qrUri})` : "", bookmark.description ? `\n${bookmark.description}` : ""]
    .filter(Boolean)
    .join("\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="URL" target={bookmark.url} text={bookmark.url} />
          <List.Item.Detail.Metadata.Label title="Space" text={space?.name ?? bookmark.spaceName} />
          {bookmark.tags.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Tags">
              {bookmark.tags.map((tag) => (
                <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={`${formatDate(bookmark.createdAt)} · ${bookmark.authorName ?? bookmark.authorEmail}`}
          />
          <List.Item.Detail.Metadata.Label title="Updated" text={formatDate(bookmark.updatedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
