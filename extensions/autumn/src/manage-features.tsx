import { ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { autumn } from "./autumn";
import OpenInAutumn from "./components/open-in-autumn";

export default function ManageFeatures() {
  const {
    isLoading,
    data: features,
    error,
  } = useCachedPromise(
    async () => {
      const { data, error } = await autumn.features.list();
      if (error) throw new Error(error.message);
      return data.list;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !features.length && !error ? (
        <List.EmptyView
          description="Define the features of your application you want to charge for."
          actions={
            <ActionPanel>
              <OpenInAutumn route="products?tab=features" />
            </ActionPanel>
          }
          />
        ) : (
          features.map((feature) => (
            <List.Item
            key={feature.id}
            icon={Icon.Tag}
            title={feature.name}
            accessories={[{tag: feature.type}]}
            actions={
              <ActionPanel>
                <OpenInAutumn route="products?tab=features" />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}