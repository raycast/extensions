import { Action, ActionPanel, Icon } from "@raycast/api";
import type { DetailDoc } from "@/core/ui/hooks/use-detail-view";
import { strings } from "@/strings";

// 右侧详情面板的开合，以及面板主体在笔记和歌词之间切换。各界面共用。
// Show Notes / Show Lyrics 的图标和 Open Note / Open Lyrics 一致，同一个东西用同一个图标。
export function ViewToggleSection({
  showDetail,
  detailDoc,
  onToggleDetail,
  onToggleDetailDoc,
}: {
  showDetail: boolean;
  detailDoc: DetailDoc;
  onToggleDetail: () => void;
  onToggleDetailDoc: () => void;
}) {
  return (
    <ActionPanel.Section title={strings.sectionView}>
      <Action
        title={showDetail ? strings.showOverview : strings.showDetail}
        icon={Icon.AppWindowSidebarRight}
        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        onAction={onToggleDetail}
      />
      {showDetail && (
        <Action
          title={detailDoc === "notes" ? strings.showLyrics : strings.showNotes}
          icon={Icon.Book}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "t" }}
          onAction={onToggleDetailDoc}
        />
      )}
    </ActionPanel.Section>
  );
}
