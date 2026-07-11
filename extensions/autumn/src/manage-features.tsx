import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { autumn } from "./autumn";
import OpenInAutumnAction from "./components/OpenInAutumnAction";

export default function ManageFeatures() {
  const {
    isLoading,
    data: { features, credits },
    error,
  } = useCachedPromise(
    async () => {
      const { data, error } = await autumn.features.list();
      if (error) throw new Error(error.message);
      return {
        features: data.list.filter((feature) => feature.type !== "credit_system"),
        credits: data.list.filter((feature) => feature.type === "credit_system"),
      };
    },
    [],
    {
      initialData: {
        features: [],
        credits: [],
      },
    },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !features.length && !error ? (
        <List.EmptyView
          description="Define the features of your application you want to charge for."
          actions={
            <ActionPanel>
              <OpenInAutumnAction route="products?tab=features" />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title="Features" subtitle={features.length.toString()}>
            {features.map((feature) => (
              <List.Item
                key={feature.id}
                icon={Icon.Tag}
                title={feature.name}
                subtitle={feature.id}
                accessories={[
                  {
                    tag: {
                      value:
                        feature.type === "single_use"
                          ? "consumable"
                          : feature.type === "continuous_use"
                            ? "allocated"
                            : feature.type,
                      color: feature.type === "boolean" ? Color.Green : Color.Blue,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <OpenInAutumnAction route="products?tab=features" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          <List.Section title="Credits" subtitle={credits.length.toString()}>
            {credits.map((credit) => (
              <List.Item
                key={credit.id}
                icon={Icon.BankNote}
                title={credit.name}
                subtitle={credit.id}
                actions={
                  <ActionPanel>
                    <OpenInAutumnAction route="products?tab=features" />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
