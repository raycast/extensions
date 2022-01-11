import { ActionPanel, ActionPanelSection, PushAction, ActionPanelItem, List, Icon } from "@raycast/api";
import UtilDetailView from "./util-detail-view";
import { Util, Stats } from "../interfaces";

interface UtilListItemProps {
  util: Util;
  stats: Stats;
}

const UtilListItem = ({ util, stats }: UtilListItemProps) => {
  const { accessCounts, increment, clear } = stats;
  const actions = (
    <ActionPanel>
      <ActionPanelSection>
        <PushAction
          icon={Icon.Pencil}
          title="Use util"
          target={<UtilDetailView util={util} />}
          onPush={() => increment(util.name)}
        />
      </ActionPanelSection>
      <ActionPanelSection title="Counts">
        <ActionPanelItem title="Clear use count for this util" onAction={() => clear(util.name)} />
        <ActionPanelItem title="Clear all use counts" onAction={() => clear()} />
      </ActionPanelSection>
    </ActionPanel>
  );

  const accessCount = accessCounts[util.name] || 0;

  return (
    <List.Item
      icon={util?.icon || "list-icon.png"}
      title={util.name}
      subtitle={util?.description}
      accessoryTitle={`Used: ${accessCount} ${accessCount === 1 ? "time" : "times"}`}
      actions={actions}
    />
  );
};

interface UtilListViewProps {
  utils: Util[];
  stats: Stats;
}

const UtilListView = ({ utils, stats }: UtilListViewProps) => {
  return (
    <List isLoading={false} searchBarPlaceholder="Select util">
      {Object.values(utils).map((util) => (
        <UtilListItem key={util.name} util={util} stats={stats} />
      ))}
    </List>
  );
};

export default UtilListView;
