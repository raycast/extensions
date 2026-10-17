import { Color, Detail, Icon } from "@raycast/api";
import type { Memo } from "../api/memo";
import { getConfiguredInstanceUrl } from "../helpers/preferences";
import { MemoActions } from "./MemoActions";
import { memoTitle } from "./memoTitle";

type Props = { memo: Memo };

const visibilityIcon = (visibility: string) => {
  if (visibility === "PUBLIC") return Icon.Globe;
  if (visibility === "PROTECTED") return Icon.TwoPeople;
  return Icon.Lock;
};

export const MemoDetail = ({ memo }: Props) => (
  <Detail
    markdown={memo.content}
    navigationTitle={memoTitle(memo.content)}
    metadata={
      <Detail.Metadata>
        <Detail.Metadata.Label title="Created" text={new Date(memo.createTime).toLocaleString()} />
        <Detail.Metadata.Label title="Updated" text={new Date(memo.updateTime).toLocaleString()} />
        <Detail.Metadata.Label title="Visibility" text={memo.visibility} icon={visibilityIcon(memo.visibility)} />
        {memo.tags.length > 0 ? (
          <Detail.Metadata.TagList title="Tags">
            {memo.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Blue} />
            ))}
          </Detail.Metadata.TagList>
        ) : null}
        {memo.pinned ? <Detail.Metadata.Label title="Pinned" text="Yes" icon={Icon.Pin} /> : null}
      </Detail.Metadata>
    }
    actions={<MemoActions memo={memo} instanceUrl={getConfiguredInstanceUrl()} />}
  />
);
