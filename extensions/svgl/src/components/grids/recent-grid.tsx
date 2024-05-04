import { Grid } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import SvgAction from "../svg-action";

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
        .map((svg, index) => (
          <Grid.Item
            key={index}
            content={{
              value: {
                source: {
                  light: typeof svg.route === "string" ? svg.route : svg.route.light,
                  dark: typeof svg.route === "string" ? svg.route : svg.route.dark,
                },
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
