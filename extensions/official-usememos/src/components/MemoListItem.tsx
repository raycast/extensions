import { Color, Icon, List } from "@raycast/api";
import type { Memo } from "../api/memo";
import { MemoActions } from "./MemoActions";
import { memoTitle } from "./memoTitle";

type Props = {
  memo: Memo;
  instanceUrl: string;
  isEditable: boolean;
  onReload: () => void;
};

const visibilityIcon = (visibility: string) => {
  if (visibility === "PUBLIC") return Icon.Globe;
  if (visibility === "PROTECTED") return Icon.TwoPeople;
  return Icon.Lock;
};

export const MemoListItem = ({ memo, instanceUrl, isEditable, onReload }: Props) => (
  <List.Item
    title={memoTitle(memo.content)}
    icon={memo.pinned ? Icon.Pin : Icon.Document}
    accessories={[{ date: new Date(memo.updateTime) }]}
    detail={
      <List.Item.Detail
        markdown={memo.content}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Created" text={new Date(memo.createTime).toLocaleString()} />
            <List.Item.Detail.Metadata.Label title="Updated" text={new Date(memo.updateTime).toLocaleString()} />
            <List.Item.Detail.Metadata.Label
              title="Visibility"
              text={memo.visibility}
              icon={visibilityIcon(memo.visibility)}
            />
            {memo.tags.length > 0 ? (
              <List.Item.Detail.Metadata.TagList title="Tags">
                {memo.tags.map((tag) => (
                  <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Blue} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            ) : null}
            {memo.pinned ? <List.Item.Detail.Metadata.Label title="Pinned" text="Yes" icon={Icon.Pin} /> : null}
          </List.Item.Detail.Metadata>
        }
      />
    }
    actions={<MemoActions memo={memo} instanceUrl={instanceUrl} isEditable={isEditable} onReload={onReload} />}
  />
);
