import { useEffect, useState } from "react";
import { ActionPanel, Action, Detail, Toast, showToast, Icon } from "@raycast/api";
import { usePromise, useFetch, useLocalStorage } from "@raycast/utils";
import TurndownService from "turndown";
import type { SingleProductRoot, Variant, ProductJsRoot, StoreMetaRoot } from "./types";
import { buildProductJsonUrl, buildProductJsUrl, buildProductPageUrl, buildStoreOrigin } from "./services/shopify-api";
import { formatPrice, normalizeTags, convertCentsToDollars } from "./services/product-mapper";
import Recommendations from "./recommendations";

export function sanitizeHtml(html: string): string {
  try {
    const withoutScripts = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
    const stripped = withoutScripts.replace(/<[^>]*>/g, "");
    return stripped.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.error("[sanitizeHtml] stripping failed:", err);
    return "";
  }
}

type Props = {
  handle: string;
  baseUrl?: string | null;
};

export default function ProductDetail({ handle, baseUrl }: Props) {
  const [imageIndex, setImageIndex] = useState<number>(0);
  const { value: storeRoute } = useLocalStorage<string | null>("storeRoute", null);
  const effectiveStoreRoute = baseUrl ?? storeRoute ?? undefined;
  const storeOrigin = buildStoreOrigin(effectiveStoreRoute);

  const { data: storeMeta, isLoading: isLoadingStoreMeta } = useFetch<StoreMetaRoot>(`${storeOrigin}/meta.json`, {
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<StoreMetaRoot>;
    },
  });
  const storeCurrency = storeMeta?.currency;

  const { isLoading: isLoadingProduct, data: productData } = usePromise(
    async (sc?: string, productHandle?: string, route?: string) => {
      const usedCurrency = sc ?? "USD";
      const baseJsonUrl = buildProductJsonUrl(route ?? effectiveStoreRoute, productHandle ?? handle);
      const productJsonUrl = `${baseJsonUrl}?currency=${usedCurrency}`;
      const productJsUrl = `${buildProductJsUrl(route ?? effectiveStoreRoute, productHandle ?? handle)}?currency=${usedCurrency}`;

      const [jsonRes, jsRes] = await Promise.all([fetch(productJsonUrl), fetch(productJsUrl)]);

      if (!jsonRes.ok) {
        throw new Error(`Failed to load product (${jsonRes.status})`);
      }

      const jsonData = (await jsonRes.json()) as SingleProductRoot;
      let jsData: ProductJsRoot | null = null;

      if (jsRes.ok) {
        jsData = (await jsRes.json()) as ProductJsRoot;
      }

      return { product: jsonData.product ?? null, productJs: jsData };
    },
    [storeCurrency, handle, effectiveStoreRoute],
    {
      execute: storeMeta !== undefined,
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load product",
          message: error.message,
        });
      },
    },
  );

  const product = productData?.product ?? null;
  const productJs = productData?.productJs ?? null;

  useEffect(() => {
    setImageIndex(0);
  }, [product?.id]);

  if (isLoadingProduct || isLoadingStoreMeta || storeMeta === undefined) return <Detail isLoading />;

  if (!product) return <Detail markdown={`# Not found\nCould not load product ${handle}`} />;
  const turndown = new TurndownService({ headingStyle: "atx" });
  turndown.addRule("preserveBlockquote", {
    filter: "blockquote",
    replacement: (content: string) => `> ${content.replace(/\n/g, "\n> ")}`,
  });
  // sanitizeHtml moved to module scope

  const sanitizedHtml = product.body_html ? sanitizeHtml(product.body_html) : "";
  const bodyMd = sanitizedHtml ? turndown.turndown(sanitizedHtml).replace(/\\\*/g, "*") : "";

  const firstVariant: Variant | null = product.variants && product.variants.length > 0 ? product.variants[0] : null;

  let variantPrice: string | null = firstVariant?.price ?? null;
  let variantAvailable = firstVariant?.available ?? false;

  if (productJs && productJs.variants && productJs.variants.length > 0) {
    const jsVariant = productJs.variants[0];
    const priceInDollars = convertCentsToDollars(jsVariant.price);
    variantPrice = priceInDollars !== null ? String(priceInDollars) : null;
    variantAvailable = jsVariant.available;
  }

  const formattedPrice = formatPrice(variantPrice, storeCurrency);
  const productUrl = buildProductPageUrl(effectiveStoreRoute, handle);

  const topImage = product.images && product.images.length > 0 ? product.images[0].src : undefined;
  const currentImage =
    product.images && product.images.length > 0 ? product.images[imageIndex % product.images.length].src : topImage;
  const topImageMd = currentImage
    ? `<img src="${currentImage}" alt="${product.title ?? "image"}" style="width:200px; height:200px; object-fit:cover; display:block; margin-bottom:12px; border-radius:8px;" height="200" />\n\n`
    : "";
  const md = [
    `${topImageMd}# ${product.title ?? "Untitled"}`,
    `**Vendor:** ${product.vendor ?? ""}`,
    "",
    bodyMd,
    "",
  ].join("\n\n");

  const tags = normalizeTags(product.tags ?? null);
  const productType = product.product_type ?? null;
  const availability = variantAvailable;

  return (
    <Detail
      markdown={md}
      navigationTitle={product.title ?? "Product"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={productUrl} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action.CopyToClipboard
            title="Copy Product Handle"
            content={handle}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Storefront Link"
            content={productUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
          {product.id && (
            <Action.Push
              title="View Recommendations"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              target={
                <Recommendations
                  productId={product.id}
                  productHandle={product.handle ?? handle}
                  baseUrl={effectiveStoreRoute}
                />
              }
            />
          )}
          {firstVariant && (
            <>
              <Action.CopyToClipboard
                title="Copy Default Variant Checkout"
                content={`${storeOrigin}/cart/${firstVariant.id}:1`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              />
              <Action.OpenInBrowser
                title="Open Default Variant Checkout"
                url={`${storeOrigin}/cart/${firstVariant.id}:1`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              />
            </>
          )}
          {product.images && product.images.length > 0 && (
            <ActionPanel.Section title="Images">
              <Action
                title="Previous Image"
                onAction={() => setImageIndex((i) => Math.max(0, i - 1))}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
              />
              <Action
                title="Next Image"
                onAction={() => setImageIndex((i) => (product.images ? Math.min(product.images.length - 1, i + 1) : i))}
                shortcut={{ modifiers: ["cmd"], key: "]" }}
              />
              <Action.CopyToClipboard
                title="Copy Image URL"
                content={currentImage ?? ""}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.OpenInBrowser
                title="Open Image in Browser"
                url={currentImage ?? ""}
                shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              />
            </ActionPanel.Section>
          )}
          {product.variants?.map((v: Variant) => {
            const variantId = v.id;
            const checkoutUrl = `${storeOrigin}/cart/${variantId}:1`;
            return (
              <ActionPanel.Section key={`variants-${variantId}`} title={v.title}>
                <Action.CopyToClipboard title={`Copy Checkout Link (${v.title})`} content={checkoutUrl} />
                <Action.OpenInBrowser title={`Open Checkout (${v.title})`} url={checkoutUrl} />
              </ActionPanel.Section>
            );
          })}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          {topImage && <Detail.Metadata.Label title="Image" text={topImage} />}
          {formattedPrice && <Detail.Metadata.Label title="Price" text={formattedPrice} icon={Icon.CreditCard} />}
          {productType && <Detail.Metadata.Label title="Type" text={productType} />}
          {tags && tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {tags.map((t) => (
                <Detail.Metadata.TagList.Item key={t} text={t} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Availability" text={availability ? "Available" : "Unavailable"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Buy" target={productUrl} text={productUrl} />
          {product.variants &&
            product.variants.length > 0 &&
            !(product.variants.length === 1 && product.variants[0].title === "Default Title") && (
              <>
                <Detail.Metadata.Separator />
                {product.variants.map((v: Variant, index: number) => {
                  let variantImage: string | undefined;
                  if (product.images) {
                    for (const img of product.images) {
                      const ids = (img.variant_ids ?? []) as unknown[];
                      if (ids && Array.isArray(ids) && ids.includes(v.id)) {
                        variantImage = img.src;
                        break;
                      }
                    }
                  }

                  const jsVariant = productJs?.variants?.[index];
                  let vPrice: string | null = v.price;
                  let vAvailable = v.available ?? false;

                  if (jsVariant) {
                    const priceInDollars = convertCentsToDollars(jsVariant.price);
                    vPrice = priceInDollars !== null ? String(priceInDollars) : null;
                    vAvailable = jsVariant.available;
                  }

                  const variantAvailability = vAvailable ? "Available" : "Unavailable";
                  return (
                    <Detail.Metadata.Label
                      key={`variant-${v.id}`}
                      title={`${v.title} — ${variantAvailability}`}
                      text={`${formatPrice(vPrice, storeCurrency) ?? vPrice}${variantImage ? ` • image: ${variantImage}` : ""}`}
                    />
                  );
                })}
              </>
            )}
        </Detail.Metadata>
      }
    />
  );
}
