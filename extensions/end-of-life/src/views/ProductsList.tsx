import { ActionPanel, Action, List, Icon, useNavigation } from "@raycast/api";
import useEndOfLifeProducts from "../hooks/useEndOfLifeProducts";
import ProductDetails from "../components/ProductDetails";

function ProductsList() {
  const { push } = useNavigation();
  const [products, isLoading] = useEndOfLifeProducts();

  return (
    <List isLoading={isLoading}>
      <EmptyView />
      <List.Section title="Products">
        {products.map((product: string) => (
          <List.Item
            id={product}
            key={product}
            //   icon={{
            //     source: standing.position + ".png",
            //     tintColor: Color.PrimaryText,
            //   }}
            title={product}
            //   subtitle={standing.Constructors[standing.Constructors.length - 1]?.name}
            // detail={
            //   <ProductDetails product={product} />
            // }
            actions={
              <ActionPanel title={product}>
                <Action title={`View ${product} Cycles`} onAction={() => push(<ProductDetails product={product} />)} />
                <Action.OpenInBrowser
                  title="View on endoflife.com"
                  url={`https://endoflife.date/${product}`}
                  icon={Icon.Rocket}
                />
              </ActionPanel>
            }
            //   accessories={[{ text: standing.points }]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function EmptyView() {
  return <List.EmptyView icon="empty-view.png" description="No Products" />;
}

export default ProductsList;
