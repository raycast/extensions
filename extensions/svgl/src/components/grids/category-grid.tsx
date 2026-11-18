import { Grid } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import SvgAction from "../svg-action";
import { getSvgRouteSource } from "../../utils/svg-route";

interface CategoryGridProps {
  selectCategory: string;
}

const CategoryGrid = ({ selectCategory }: CategoryGridProps) => {
  const { categories, svgs } = useSvglExtension();
  return (
    <Grid.Section
      title={`${selectCategory}`}
      subtitle={categories.find((category) => category.category === selectCategory)?.total.toString()}
    >
      {svgs
        .filter((svg) => svg.category === selectCategory || svg.category?.includes(selectCategory))
        .map((svg) => (
          <Grid.Item
            key={`${selectCategory}_${svg.id}`}
            id={`${selectCategory}_${svg.id}`}
            content={{
              value: {
                source: getSvgRouteSource(svg.route),
              },
              tooltip: svg.title,
            }}
            title={svg.title}
            actions={<SvgAction svg={svg} category={selectCategory} />}
          />
        ))}
    </Grid.Section>
  );
};

export default CategoryGrid;
