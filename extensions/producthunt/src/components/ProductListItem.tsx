import React, { JSX } from "react";
import { List, Icon, Color, useNavigation } from "@raycast/api";
import { Product } from "../types";
import { ProductDetailView } from "./ProductDetailView";
import { ProductActions, ViewContext } from "./ProductActions";
import { cleanText } from "../util/textUtils";

interface ProductListItemProps {
  product: Product;
  showTopics?: boolean;
  additionalAccessories?: List.Item.Accessory[];
  featured?: boolean;
  index?: number;
  totalProducts?: number;
  allProducts?: Product[];
}

export function ProductListItem({
  product,
  showTopics = true,
  additionalAccessories = [],
  featured = false,
  index,
  totalProducts,
  allProducts = [],
}: ProductListItemProps) {
  const { push } = useNavigation();

  const formattedDate = new Date(product.createdAt).toLocaleDateString();

  // Use featuredImage if available, otherwise fall back to thumbnail
  const thumbnailSource = product.featuredImage || product.thumbnail || Icon.Document;

  let baseAccessories: List.Item.Accessory[] = [];

  if (featured) {
    baseAccessories = [
      { text: product.commentsCount ? `${product.commentsCount}` : undefined, icon: { source: Icon.Bubble } },
      { text: `${product.votesCount}`, icon: { source: Icon.ArrowUp } },
      ...(product.maker ? [{ text: `by ${product.maker.name}` }] : []),
    ];
  } else {
    baseAccessories = [
      { text: `${product.votesCount} votes` },
      { text: formattedDate },
      ...(product.maker ? [{ text: `by ${product.maker.name}` }] : []),
    ];
  }

  const accessories = [...additionalAccessories, ...baseAccessories];

  const itemProps = featured
    ? {
        title: cleanText(product.name),
        subtitle: cleanText(product.tagline),
        icon: { source: thumbnailSource },
        accessories,
        tintColor: Color.Yellow,
      }
    : {
        title: cleanText(product.name),
        subtitle: cleanText(product.tagline),
        icon: { source: thumbnailSource },
        accessories,
      };

  const handleNavigateToProduct = (currentProduct: Product, newIndex: number) => {
    if (allProducts && allProducts.length > 0 && newIndex >= 0 && newIndex < allProducts.length) {
      push(
        <ProductDetailView
          product={allProducts[newIndex]}
          index={newIndex}
          totalProducts={totalProducts || allProducts.length}
          onNavigateToProduct={handleNavigateToProduct}
        />,
      );
    }
  };

  return (
    <List.Item
      {...itemProps}
      actions={
        (
          <ProductActions
            product={product}
            index={index}
            totalProducts={totalProducts}
            allProducts={allProducts}
            onNavigateToProduct={handleNavigateToProduct}
            viewContext={ViewContext.List}
            showTopics={showTopics}
          />
        ) as JSX.Element
      }
    />
  ) as JSX.Element;
}
