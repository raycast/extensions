import React, { JSX } from "react";
import { List, Icon, Color, useNavigation } from "@raycast/api";
import { Product } from "../types";
import { ProductDetailView } from "./ProductDetailView";
import { ProductActions, ViewContext } from "./ProductActions";
import { cleanText } from "../util/textUtils";
import { processImageUrl, ImgixFit } from "../api/imgix";

// PH product images are wide (e.g. 1024x512), which renders as a non-square, cropped-looking
// list icon. Square-crop imgix URLs to a centered 64x64 so list icons read as logos.
function squareListIcon(url: string): string {
  if (!url.includes("imgix.net")) return url;
  return processImageUrl(url, { width: 64, height: 64, fit: ImgixFit.CROP, auto: ["format", "compress"] });
}

interface ProductListItemProps {
  product: Product;
  showTopics?: boolean;
  additionalAccessories?: List.Item.Accessory[];
  featured?: boolean;
  index?: number;
  totalProducts?: number;
  allProducts?: Product[];
  onRefresh?: () => void;
}

export function ProductListItem({
  product,
  showTopics = true,
  additionalAccessories = [],
  featured = false,
  index,
  totalProducts,
  allProducts = [],
  onRefresh,
}: ProductListItemProps) {
  const { push } = useNavigation();

  const formattedDate = new Date(product.createdAt).toLocaleDateString();

  // Use featuredImage if available, otherwise fall back to thumbnail; square-crop URLs for the
  // list icon (the Icon.Document fallback is not a URL and passes through untouched).
  const rawThumbnail = product.featuredImage || product.thumbnail;
  const thumbnailSource = rawThumbnail ? squareListIcon(rawThumbnail) : Icon.Document;

  let baseAccessories: List.Item.Accessory[] = [];

  // The submitter (Post.user / feed author) — a documented role, shown as a bare name (not "by",
  // which would imply making/authorship we can't verify on a public token).
  const submitter = product.submittedBy ?? product.maker;
  if (featured) {
    baseAccessories = product.isFeedFallback
      ? [...(submitter ? [{ text: submitter.name }] : [])]
      : [
          { text: product.commentsCount ? `${product.commentsCount}` : undefined, icon: { source: Icon.Bubble } },
          { text: `${product.votesCount}`, icon: { source: Icon.ArrowUp } },
          ...(submitter ? [{ text: submitter.name }] : []),
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
            onRefresh={onRefresh}
          />
        ) as JSX.Element
      }
    />
  ) as JSX.Element;
}
