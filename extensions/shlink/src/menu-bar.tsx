import { Icon, MenuBarExtra } from "@raycast/api";
import { useApiFetchSimple } from "./shared";
import { useCachedState } from "@raycast/utils";

interface VisitDataItem {
  total: number;
  nonBots: number;
  bots: number;
}

interface VisitData {
  visits: {
    nonOrphanVisits: VisitDataItem;
    orphanVisits: VisitDataItem;
  };
}

export default function Command() {
  const [orphanType, setOrphanType] = useCachedState<boolean>("orphanType", false);
  const [specificView, setSpecificView] = useCachedState<keyof VisitDataItem | null>("specificView", null);
  const { isLoading, data } = useApiFetchSimple<VisitData>("visits");
  if (isLoading || !data) return <MenuBarExtra title="Loading..." isLoading={isLoading} />;
  const {
    visits: { nonOrphanVisits, orphanVisits },
  } = data;

  const defaultVisits = orphanType ? orphanVisits : nonOrphanVisits;

  const types = {
    total: `👀 ${defaultVisits.total}`,
    nonBots: `💁 ${defaultVisits.nonBots}`,
    bots: `🤖 ${defaultVisits.bots}`,
  };

  function currentDefaultView(exp: boolean): string {
    return exp ? " (Now In Menu-Bar)" : "";
  }

  function stats(visits: VisitDataItem, useOrphanType: boolean) {
    return [
      <MenuBarExtra.Item
        key="total"
        title="👀 Total"
        subtitle={visits.total.toString() + currentDefaultView(orphanType == useOrphanType && specificView === "total")}
        onAction={() => {
          setOrphanType(useOrphanType);
          setSpecificView("total");
        }}
      />,
      <MenuBarExtra.Item
        key="nonBots"
        title="💁 Non-bots"
        subtitle={
          visits.nonBots.toString() + currentDefaultView(orphanType == useOrphanType && specificView === "nonBots")
        }
        onAction={() => {
          setOrphanType(useOrphanType);
          setSpecificView("nonBots");
        }}
      />,
      <MenuBarExtra.Item
        key="bots"
        title="🤖 Bots"
        subtitle={visits.bots.toString() + currentDefaultView(orphanType == useOrphanType && specificView === "bots")}
        onAction={() => {
          setOrphanType(useOrphanType);
          setSpecificView("bots");
        }}
      />,
    ];
  }

  const tooltipTypes = {
    total: "Total visits",
    nonBots: "Non-bots visits",
    bots: "Bots visits",
  };
  const title = specificView ? types[specificView] : Object.values(types).join("  ");
  const tooltip =
    (specificView ? tooltipTypes[specificView] : Object.values(tooltipTypes).join(" ")) +
    ` in ${orphanType ? "" : "Non-"}Orphan Visits`;

  return (
    <MenuBarExtra title={title} isLoading={isLoading} tooltip={tooltip}>
      <MenuBarExtra.Section title={`Non-Orphan (Correct) Visits${currentDefaultView(!orphanType && !specificView)}`}>
        {[
          ...stats(nonOrphanVisits, false),
          (orphanType || specificView) && (
            <MenuBarExtra.Item
              title="Set as Default View"
              key="default"
              icon={{ source: Icon.Eye }}
              onAction={() => {
                setOrphanType(false);
                setSpecificView(null);
              }}
            />
          ),
        ]}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section
        title={`Orphan (like 404 and other) Visits${currentDefaultView(orphanType && !specificView)}`}
      >
        {[
          ...stats(orphanVisits, true),
          (!orphanType || specificView) && (
            <MenuBarExtra.Item
              title="Set as Default View"
              key="default"
              icon={{ source: Icon.Eye }}
              onAction={() => {
                setOrphanType(true);
                setSpecificView(null);
              }}
            />
          ),
        ]}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
