import { Cache, Grid, Toast, showToast } from "@raycast/api";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { Category, Svg } from "./type";
import SvgAction from "./svg-action";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [svgs, setSvgs] = useState<Svg[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectCategory, setSelectCategory] = useState("All");

  const CACHE_KEY = "svglData";
  const CACHE_DURATION_MS = 60 * 1000; // 1 minute api response cache
  const API_URL = "https://svgl.app/api";

  const cache = new Cache();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);

      const cachedData = cache.get(CACHE_KEY);
      let isCacheValid = false;

      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setSvgs(data.svgs);
          setCategories(data.categories);
          isCacheValid = true;
        }
      }

      if (isCacheValid) {
        setIsLoading(false);
        return;
      }

      try {
        const svgsResponse = await fetch(`${API_URL}/svgs`);
        const categoriesResponse = await fetch(`${API_URL}/categories`);

        if (svgsResponse.ok && categoriesResponse.ok) {
          const svgsData = (await svgsResponse.json()) as Svg[];
          const categoriesData = (await categoriesResponse.json()) as Category[];
          const cacheData = { data: { svgs: svgsData, categories: categoriesData }, timestamp: Date.now() };

          const allCount = categoriesData.reduce((acc, cur) => acc + cur.total, 0);
          categoriesData.unshift({ category: "All", total: allCount });

          setSvgs(svgsData);
          setCategories(categoriesData);
          cache.set(CACHE_KEY, JSON.stringify(cacheData));
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Loading Failed",
            message: `Error ${
              svgsResponse.ok ? categoriesResponse.status : svgsResponse.status
            }, please try again later.`,
          });
        }
      } catch (error: unknown) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Can't get the data from svgl API",
          message: "Please try again later.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <Grid
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      navigationTitle="Search SVG Logos"
      searchBarPlaceholder="Search SVG Logos"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Logo Category"
          storeValue={true}
          onChange={(newValue) => setSelectCategory(newValue)}
        >
          <Grid.Dropdown.Section title="Logo Categories">
            {categories.map((category) => (
              <Grid.Dropdown.Item
                key={category.category}
                title={category.category + " - " + category.total}
                value={category.category}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isLoading &&
        svgs
          .filter((svg) => svg.category === selectCategory || selectCategory === "All")
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
              subtitle={svg.category}
              actions={<SvgAction svg={svg} category={selectCategory} />}
            />
          ))}
    </Grid>
  );
}
