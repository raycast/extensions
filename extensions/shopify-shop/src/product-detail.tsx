import { useEffect, useState } from "react";
import { ActionPanel, Action, Detail, Toast, showToast, Icon } from "@raycast/api";
import { usePromise, useFetch } from "@raycast/utils";
import TurndownService from "turndown";
import DOMPurify from "dompurify";

export function sanitizeHtml(html: string, options?: Record<string, unknown>): string {
  try {
    const purifyCandidate: unknown = DOMPurify as unknown;

    // Case: object with sanitize
    if (
      purifyCandidate &&
      typeof purifyCandidate === "object" &&
      "sanitize" in purifyCandidate &&
      typeof (purifyCandidate as { sanitize?: unknown }).sanitize === "function"
    ) {
      return (purifyCandidate as { sanitize: (s: string, o?: Record<string, unknown>) => string }).sanitize(
        html,
        options,
      );
    }

    // Case: default export contains sanitize
    if (
      purifyCandidate &&
      typeof purifyCandidate === "object" &&
      "default" in (purifyCandidate as Record<string, unknown>) &&
      typeof ((purifyCandidate as Record<string, unknown>).default as { sanitize?: unknown })?.sanitize === "function"
    ) {
      return (
        (purifyCandidate as Record<string, unknown>).default as {
          sanitize: (s: string, o?: Record<string, unknown>) => string;
        }
      ).sanitize(html, options);
    }

    // Case: DOMPurify is a factory function (e.g., requires window)
    if (typeof purifyCandidate === "function" && typeof globalThis !== "undefined") {
      const factory = purifyCandidate as (win: unknown) => {
        sanitize?: (s: string, o?: Record<string, unknown>) => string;
      };
      const instance = factory(globalThis);
      if (instance && typeof instance.sanitize === "function") {
        return (instance.sanitize as (s: string, o?: Record<string, unknown>) => string)(html, options);
      }
    }

    // If DOMPurify isn't available, fall through to safe fallback below.
  } catch (err) {
    // Log the error for visibility; fall back to safe stripping below.
    console.error("[sanitizeHtml] DOMPurify error:", err);
  }

  // Safe fallback: remove script/style blocks then strip all tags and trim whitespace.
  try {
    const withoutScripts = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
    const stripped = withoutScripts.replace(/<[^>]*>/g, "");
    // Collapse whitespace and return plain text
    return stripped.replace(/\s+/g, " ").trim();
  } catch (err) {
    console.error("[sanitizeHtml] fallback stripping failed:", err);
    return "";
  }
}
import type { SingleProductRoot, Variant, ProductJsRoot, StoreMetaRoot } from "./types";
import { buildProductJsonUrl, buildProductPageUrl, buildStoreOrigin } from "./services/shopify-api";
import { formatPrice, normalizeTags, convertCentsToDollars } from "./services/product-mapper";
import { useLocalStorage } from "@raycast/utils";

type Props = {
  handle: string;
  baseUrl?: string | null;
};

export default function ProductDetail({ handle, baseUrl }: Props) {
  const [imageIndex, setImageIndex] = useState<number>(0);
  const { value: storeRoute } = useLocalStorage<string | null>("storeRoute", null);
  const storeOrigin = buildStoreOrigin(storeRoute ?? undefined);

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
    async (sc?: string) => {
      const usedCurrency = sc ?? "USD";
      const baseJsonUrl = buildProductJsonUrl(baseUrl ?? null, handle);
      const productJsonUrl = `${baseJsonUrl}?currency=${usedCurrency}`;
      const productJsUrl = `${baseJsonUrl.replace(/\.json$/, ".js")}?currency=${usedCurrency}`;

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
    [storeCurrency],
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

  const sanitizedHtml = product.body_html
    ? sanitizeHtml(product.body_html, {
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/)*/i,
      })
    : "";
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

  const formattedPrice = formatPrice(variantPrice, "USD");
  const productUrl = buildProductPageUrl(baseUrl ?? null, handle);

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
                      text={`${formatPrice(vPrice, "USD") ?? vPrice}${variantImage ? ` • image: ${variantImage}` : ""}`}
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
