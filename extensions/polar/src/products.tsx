import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { authenticate } from "./oauth";
import { PolarProvider, queryClient } from "./providers";
import { QueryClientProvider } from "@tanstack/react-query";
import { useOrganization } from "./hooks/organizations";
import { useProducts } from "./hooks/products";
import { Product } from "@polar-sh/sdk/dist/commonjs/models/components/product";

export default function Command() {
  const [accessToken, setAccessToken] = useState<string>();

  useEffect(() => {
    authenticate().then(setAccessToken);
  }, []);

  if (!accessToken) {
    return <Detail isLoading={true} markdown="Authenticating with Polar..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PolarProvider accessToken={accessToken}>
        <ProductsView />
      </PolarProvider>
    </QueryClientProvider>
  );
}

interface ProductProps {
  product: Product;
}

const ProductItem = ({ product }: ProductProps) => {
  const { data: organization, isLoading } = useOrganization(
    product.organizationId,
  );

  return (
    <List.Item
      key={product.id}
      icon={product.medias.length ? product.medias[0].publicUrl : Icon.Box}
      title={product.name}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={product.description}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Media" />
              {product.medias.map((media) => (
                <List.Item.Detail.Metadata.Link
                  key={media.id}
                  title={media.name}
                  text={media.publicUrl}
                  target={media.publicUrl}
                />
              ))}
              <List.Item.Detail.Metadata.Separator />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Polar"
            url={`https://polar.sh/dashboard/${organization?.slug}/products/${product.id}`}
          />
          <Action.CopyToClipboard
            title="Copy Product ID"
            content={product.id}
          />
        </ActionPanel>
      }
    />
  );
};

const ProductsView = () => {
  const { data: products, isLoading } = useProducts({});

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Products..."
      isShowingDetail
    >
      {products?.result.items.map((product) => (
        <ProductItem key={product.id} product={product} />
      ))}
    </List>
  );
};
