import type { Image } from "@raycast/api";
import { Detail, Icon, open } from "@raycast/api";

export type DepEntry = {
  key: string;
  text: string;
  icon?: Image.ImageLike;
  onAction?: () => void;
};

type DepSectionProps = {
  title: string;
  totalCount: number;
  entries: DepEntry[];
  hiddenCount: number;
  moreUrl: string;
};

const DepSection = ({ title, totalCount, entries, hiddenCount, moreUrl }: DepSectionProps) => {
  if (entries.length === 0) return null;
  return (
    <>
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title={`${title} (${totalCount})`}>
        {entries.map((e) => (
          <Detail.Metadata.TagList.Item key={e.key} text={e.text} icon={e.icon} onAction={e.onAction} />
        ))}
        {hiddenCount > 0 ? (
          <Detail.Metadata.TagList.Item
            icon={Icon.ArrowRight}
            text={`+${hiddenCount} more`}
            onAction={() => open(moreUrl)}
          />
        ) : null}
      </Detail.Metadata.TagList>
    </>
  );
};

export default DepSection;
