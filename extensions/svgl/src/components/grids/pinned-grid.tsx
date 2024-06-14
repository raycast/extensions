import { Grid } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import SvgAction from "../svg-action";

const PinnedGrid = () => {
  const { pinnedSvgIds, svgs } = useSvglExtension();
  return (
    <Grid.Section title="Pinned" subtitle={pinnedSvgIds.length.toString()}>
      {svgs
        .filter((svg) => pinnedSvgIds.includes(svg.id))
        .sort((a, b) => pinnedSvgIds.indexOf(a.id) - pinnedSvgIds.indexOf(b.id))
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
            id={`pinned_${svg.id}`}
            actions={<SvgAction svg={svg} category={svg.category?.[0] ?? svg.category} />}
          />
        ))}
    </Grid.Section>
  );
};

export default PinnedGrid;
