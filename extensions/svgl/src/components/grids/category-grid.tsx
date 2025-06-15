import { Grid } from "@raycast/api";
import { useSvglExtension } from "../app-context";
import SvgAction from "../svg-action";

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
            actions={<SvgAction svg={svg} category={selectCategory} />}
          />
        ))}
    </Grid.Section>
  );
};

export default CategoryGrid;
