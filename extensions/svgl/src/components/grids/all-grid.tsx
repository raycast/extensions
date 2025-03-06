import { Grid } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import SvgAction from "../svg-action";
import PinnedGrid from "./pinned-grid";
import RecentGrid from "./recent-grid";

const AllGrid = () => {
  const { categories, svgs } = useSvglExtension();

  return (
    <>
      <PinnedGrid />
      <RecentGrid />
      {categories.map((category, index) => (
        <Grid.Section title={category.category} subtitle={category.total.toString()} key={index}>
          {svgs
            .filter((svg) => svg.category === category.category || svg.category?.includes(category.category))
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
                actions={<SvgAction svg={svg} category={category.category} />}
              />
            ))}
        </Grid.Section>
      ))}
    </>
  );
};

export default AllGrid;
