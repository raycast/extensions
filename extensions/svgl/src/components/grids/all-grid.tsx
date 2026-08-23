import { Grid } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import SvgAction from "../svg-action";
import { getSvgRouteSource } from "../../utils/svg-route";
import PinnedGrid from "./pinned-grid";
import RecentGrid from "./recent-grid";

const AllGrid = () => {
  const { categories, svgs } = useSvglExtension();

  return (
    <>
      <PinnedGrid />
      <RecentGrid />
      {categories.map((category) => (
        <Grid.Section title={category.category} subtitle={category.total.toString()} key={category.category}>
          {svgs
            .filter((svg) => svg.category === category.category || svg.category?.includes(category.category))
            .map((svg) => (
              <Grid.Item
                key={`${category.category}_${svg.id}`}
                id={`${category.category}_${svg.id}`}
                content={{
                  value: {
                    source: getSvgRouteSource(svg.route),
                  },
                  tooltip: svg.title,
                }}
                title={svg.title}
                actions={<SvgAction svg={svg} category={category.category} />}
              />
            ))}
        </Grid.Section>
      ))}
    </>
  );
};

export default AllGrid;
