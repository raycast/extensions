import { Grid } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import SvgAction from "../svg-action";
import { getSvgRouteSource } from "../../utils/svg-route";

const RecentGrid = () => {
  const { svgs, recentSvgIds, pinnedSvgIds } = useSvglExtension();
  return (
    <Grid.Section
      title="Recently Used"
      subtitle={Math.min(recentSvgIds.filter((id) => !pinnedSvgIds.includes(id)).length, 12).toString()}
    >
      {svgs
        .filter((svg) => recentSvgIds.includes(svg.id) && !pinnedSvgIds.includes(svg.id))
        .sort((a, b) => recentSvgIds.indexOf(a.id) - recentSvgIds.indexOf(b.id))
        .slice(0, 12)
        .map((svg) => (
          <Grid.Item
            key={`recent_${svg.id}`}
            id={`recent_${svg.id}`}
            content={{
              value: {
                source: getSvgRouteSource(svg.route),
              },
              tooltip: svg.title,
            }}
            title={svg.title}
            actions={<SvgAction svg={svg} category={svg.category?.[0] ?? svg.category} />}
          />
        ))}
    </Grid.Section>
  );
};

export default RecentGrid;
