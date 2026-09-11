import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  Image,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { memo, useCallback, useMemo, useState } from "react";
import { getFulfillmentForZip } from "./lib/api/fulfillmentManager";
import {
  getProductCards,
  getProductDetail,
  getProductSupply,
  getPromotions,
  ProductCard,
  ProductSupply,
  SearchCategory,
  searchProduct,
  StoreInfo,
} from "./lib/api/migrosApi";
import { getStoresForZip } from "./lib/api/storeManager";
import { withValidToken } from "./lib/api/tokenManager";
import {
  formatNutritionTableMarkdown,
  formatPrice,
  formatRating,
  getProductImageUrl,
  getStockInfo,
  getStoreDisplayInfo,
  stripHtml,
} from "./lib/helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────────────────

interface StoreAvailability {
  store: StoreInfo;
  stock: number | string;
  isPreferred: boolean;
}

const MAX_STORES = 7;
const PREFERRED_STORE_KEY = "preferred_store_id";
const FAVORITE_PRODUCTS_KEY = "favorite_products";

interface FavoriteProduct {
  uid: number;
  migrosId: string;
  name: string;
  brand?: string;
  productUrls?: string;
  thumbnailUrl?: string;
  favoritedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────────────────────────────────────────────

function getStockIcon(status: "out-of-stock" | "low-stock" | "in-stock") {
  switch (status) {
    case "out-of-stock":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "low-stock":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "in-stock":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
}

function StoreAvailabilityMetadata({
  storeAvailabilities,
  MetadataLabel,
  MetadataSeparator,
}: {
  storeAvailabilities: StoreAvailability[];
  MetadataLabel: typeof List.Item.Detail.Metadata.Label | typeof Detail.Metadata.Label;
  MetadataSeparator?: typeof List.Item.Detail.Metadata.Separator | typeof Detail.Metadata.Separator;
}) {
  if (storeAvailabilities.length === 0) return null;

  return (
    <>
      {MetadataSeparator && <MetadataSeparator />}
      <MetadataLabel title="Store Availability" text="" />
      {storeAvailabilities.map((sa) => {
        const { storeId, storeName } = getStoreDisplayInfo(sa.store);
        const { stockText, status } = getStockInfo(sa.stock);
        return (
          <MetadataLabel
            key={storeId}
            title={`${storeName}${sa.isPreferred ? " ★" : ""}`}
            text={stockText}
            icon={getStockIcon(status)}
          />
        );
      })}
    </>
  );
}

function ProductActions({
  product,
  storeAvailabilities,
  onSetPreferred,
  showViewDetails = true,
  isFavorite,
  onToggleFavorite,
}: {
  product: ProductCard;
  storeAvailabilities: StoreAvailability[];
  onSetPreferred: (storeId: string) => void;
  showViewDetails?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (product: ProductCard) => void;
}) {
  return (
    <ActionPanel>
      {showViewDetails && (
        <Action.Push
          title="View Details"
          icon={Icon.Eye}
          target={
            <ProductDetailView
              product={product}
              storeAvailabilities={storeAvailabilities}
              onSetPreferred={onSetPreferred}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
          }
        />
      )}
      {product.productUrls && (
        <Action.OpenInBrowser
          title="Open on Migros.ch"
          url={product.productUrls}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
      )}
      <Action
        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        icon={isFavorite ? Icon.StarDisabled : Icon.Star}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => onToggleFavorite(product)}
      />
      <Action.CopyToClipboard title="Copy Product Name" content={product.name} />
      {storeAvailabilities.length > 0 && (
        <ActionPanel.Section title="Preferred Store">
          {storeAvailabilities.map((sa) => {
            const { storeId, storeName } = getStoreDisplayInfo(sa.store);
            return (
              <Action
                key={storeId}
                title={`Prefer: ${storeName}`}
                icon={sa.isPreferred ? Icon.StarCircle : Icon.Circle}
                onAction={() => onSetPreferred(storeId)}
              />
            );
          })}
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

const ProductListItem = memo(function ProductListItem({
  product,
  storeAvailabilities,
  onSetPreferred,
  isHighlighted,
  itemKey,
  subtitle,
  accessories,
  isFavorite,
  onToggleFavorite,
}: {
  product: ProductCard;
  storeAvailabilities: StoreAvailability[];
  onSetPreferred: (storeId: string) => void;
  isHighlighted: boolean;
  itemKey: string | number;
  subtitle?: string;
  accessories?: List.Item.Props["accessories"];
  isFavorite: boolean;
  onToggleFavorite: (product: ProductCard) => void;
}) {
  const thumbnailUrl = getProductImageUrl(product, "thumbnail");
  const imageUrl = getProductImageUrl(product);
  const price = formatPrice(product);

  // Memoize markdown to prevent re-render flickering
  const markdown = useMemo(
    () => (imageUrl ? `![Product Image](${imageUrl}?raycast-height=180)` : undefined),
    [imageUrl],
  );

  return (
    <List.Item
      id={String(itemKey)}
      key={itemKey}
      title={product.name}
      subtitle={subtitle ?? product.brand ?? ""}
      accessories={accessories}
      icon={thumbnailUrl ? { source: thumbnailUrl, mask: Image.Mask.RoundedRectangle } : Icon.Box}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <List.Item.Detail.Metadata>
              {price && <List.Item.Detail.Metadata.Label title="Price" text={price} />}
              {product.offer?.quantity && (
                <List.Item.Detail.Metadata.Label title="Quantity" text={product.offer.quantity} />
              )}
              {isHighlighted && (
                <StoreAvailabilityMetadata
                  storeAvailabilities={storeAvailabilities}
                  MetadataLabel={List.Item.Detail.Metadata.Label}
                  MetadataSeparator={List.Item.Detail.Metadata.Separator}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ProductActions
          product={product}
          storeAvailabilities={isHighlighted ? storeAvailabilities : []}
          onSetPreferred={onSetPreferred}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      }
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Product Detail Component
// ─────────────────────────────────────────────────────────────────────────────

function ProductDetailView({
  product,
  storeAvailabilities,
  onSetPreferred,
  isFavorite: initialIsFavorite,
  onToggleFavorite,
}: {
  product: ProductCard;
  storeAvailabilities: StoreAvailability[];
  onSetPreferred: (storeId: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (product: ProductCard) => void;
}) {
  const { zipCode } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const imageUrl = getProductImageUrl(product);
  const price = formatPrice(product, { includeBadges: false });
  const category = product.breadcrumb?.map((b) => b.name).join(" > ") || "";

  // Local favorite state to update UI immediately in detail view
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);

  const handleToggleFavorite = useCallback(() => {
    setIsFavorite((prev) => !prev);
    onToggleFavorite(product);
  }, [onToggleFavorite, product]);

  // Fetch detailed product information including nutrition
  const { data: productDetail, isLoading: isLoadingDetail } = usePromise(
    async (migrosId: string, zip: string) => {
      // Get fulfillment data for warehouseId and region
      const fulfillment = await getFulfillmentForZip(zip);

      const details = await withValidToken((token) =>
        getProductDetail(
          {
            productFilter: { migrosIds: [migrosId] },
            offerFilter: {
              warehouseId: fulfillment.warehouseId,
              region: fulfillment.cooperative,
            },
          },
          token,
        ),
      );
      return details[0] || null;
    },
    [product.migrosId, zipCode],
    { execute: !!product.migrosId && !!zipCode },
  );

  // Build markdown content (memoized to prevent unnecessary re-renders)
  const markdown = useMemo(() => {
    let md = "";
    if (imageUrl) {
      md += `![${product.name}](${imageUrl}?raycast-height=200)\n\n`;
    }
    if (product.description) {
      md += `${product.description}\n`;
    }

    // Add ingredients to markdown if available
    const ingredients = productDetail?.productInformation?.mainInformation?.ingredients;
    if (ingredients) {
      md += `\n\n### Ingredients\n${stripHtml(ingredients)}`;
    }

    // Add nutrition table to markdown if available
    const nutrientsTable = productDetail?.productInformation?.nutrientsInformation?.nutrientsTable;
    if (nutrientsTable && nutrientsTable.rows.length > 0) {
      md += formatNutritionTableMarkdown(nutrientsTable.rows, "Nutrition", "per 100g");
    }

    return md;
  }, [imageUrl, product.name, product.description, productDetail]);

  return (
    <Detail
      isLoading={isLoadingDetail}
      markdown={markdown}
      navigationTitle={product.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={product.name} />
          {product.brand && <Detail.Metadata.Label title="Brand" text={product.brand} />}
          {price && <Detail.Metadata.Label title="Price" text={price} />}
          {product.offer?.badges && product.offer.badges.length > 0 && (
            <Detail.Metadata.TagList title="Promotions">
              {product.offer.badges.map((badge, idx) => (
                <Detail.Metadata.TagList.Item key={idx} text={badge.description} color="#ff6600" />
              ))}
            </Detail.Metadata.TagList>
          )}
          {product.offer?.quantity && <Detail.Metadata.Label title="Quantity" text={product.offer.quantity} />}

          {/* Rating */}
          {productDetail?.productInformation?.mainInformation?.rating &&
            (() => {
              const { nbStars, nbReviews } = productDetail.productInformation.mainInformation.rating;
              const { ratingText } = formatRating(nbStars, nbReviews);
              return (
                <>
                  <Detail.Metadata.Separator />
                  <Detail.Metadata.Link
                    title="Rating"
                    text={ratingText}
                    target={`https://migipedia.migros.ch/products/${product.migrosId}?utm_source=www.migros.ch&utm_medium=owned&utm_content=mo-produktlink`}
                  />
                </>
              );
            })()}

          {/* Allergens */}
          {productDetail?.productInformation?.mainInformation?.allergens && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Allergens"
                text={productDetail.productInformation.mainInformation.allergens}
              />
            </>
          )}

          {/* Origin */}
          {productDetail?.productInformation?.mainInformation?.origin && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Origin" text={productDetail.productInformation.mainInformation.origin} />
            </>
          )}

          {/* Category */}
          {category && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Category" text={category} />
            </>
          )}

          {/* Store Availability */}
          <Detail.Metadata.Separator />
          {storeAvailabilities.length === 0 ? (
            <Detail.Metadata.Label title="Store Availability" text="Loading..." />
          ) : (
            storeAvailabilities.map((sa) => {
              const { storeId, storeName } = getStoreDisplayInfo(sa.store);
              const { stockText, status } = getStockInfo(sa.stock);
              return (
                <Detail.Metadata.Label
                  key={storeId}
                  title={`${storeName}${sa.isPreferred ? " ★" : ""}`}
                  text={stockText}
                  icon={getStockIcon(status)}
                />
              );
            })
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            {product.productUrls && <Action.OpenInBrowser title="Open on Migros.ch" url={product.productUrls} />}
            <Action
              title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={handleToggleFavorite}
            />
            <Action.CopyToClipboard title="Copy Product Name" content={product.name} />
            <Action
              title="Go Back to List"
              icon={Icon.ArrowLeft}
              onAction={pop}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
            />
          </ActionPanel.Section>
          {storeAvailabilities.length > 0 && (
            <ActionPanel.Section title="Preferred Store">
              {storeAvailabilities.map((sa) => {
                const { storeId, storeName } = getStoreDisplayInfo(sa.store);
                return (
                  <Action
                    key={storeId}
                    title={`Prefer: ${storeName}${sa.isPreferred ? " ✓" : ""}`}
                    icon={sa.isPreferred ? Icon.StarCircle : Icon.Star}
                    onAction={() => onSetPreferred(storeId)}
                  />
                );
              })}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Command Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchMigros() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [preferredStoreId, setPreferredStoreId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<SearchCategory[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);

  // Load preferred store and favorites from LocalStorage on mount
  usePromise(async () => {
    const [storedStore, storedFavorites] = await Promise.all([
      LocalStorage.getItem<string>(PREFERRED_STORE_KEY),
      LocalStorage.getItem<string>(FAVORITE_PRODUCTS_KEY),
    ]);
    if (storedStore) {
      setPreferredStoreId(storedStore);
    }
    if (storedFavorites) {
      try {
        setFavoriteProducts(JSON.parse(storedFavorites));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Fetch fulfillment data (cooperative + warehouseId) based on zip code
  const { data: fulfillment } = usePromise(
    async (zipCode: string) => {
      if (!zipCode) return null;
      return await getFulfillmentForZip(zipCode);
    },
    [preferences.zipCode],
    { execute: !!preferences.zipCode },
  );

  // Fetch promotions when there's no search text
  const { isLoading: isLoadingPromotions, data: promotionsData } = usePromise(
    async (region: string | undefined) => {
      const promotions = await withValidToken((token) =>
        getPromotions(token, preferences.language, region || "national"),
      );

      // Get the first product ID from each promotion (one per promotion group)
      const productIdsToFetch = new Set<number>();
      for (const detail of promotions.promotionDetails) {
        if (detail.productIds.length > 0) {
          productIdsToFetch.add(detail.productIds[0]);
        }
      }

      if (productIdsToFetch.size === 0) {
        return { promotionDetails: promotions.promotionDetails, products: [] };
      }

      // Fetch product cards for promotion products
      const cards = await withValidToken((token) =>
        getProductCards(
          {
            productFilter: { uids: Array.from(productIdsToFetch) },
            language: preferences.language,
            offerFilter: {
              region: region || "national",
              storeType: "OFFLINE",
            },
          },
          token,
        ),
      );

      return { promotionDetails: promotions.promotionDetails, products: cards };
    },
    [fulfillment?.cooperative],
    { execute: searchText.length < 2 },
  );

  // Fetch favorite products when there's no search text
  const { isLoading: isLoadingFavorites, data: favoriteProductCards } = usePromise(
    async (favorites: FavoriteProduct[], region: string | undefined) => {
      if (favorites.length === 0) return [];

      const uids = favorites.map((b) => b.uid);
      const cards = await withValidToken((token) =>
        getProductCards(
          {
            productFilter: { uids },
            language: preferences.language,
            offerFilter: {
              region: region || "national",
              storeType: "OFFLINE",
            },
          },
          token,
        ),
      );

      // Sort by favorite timestamp (most recent first)
      const favoriteOrder = new Map(favorites.map((f) => [f.uid, f.favoritedAt || 0]));
      cards.sort((a, b) => (favoriteOrder.get(b.uid) || 0) - (favoriteOrder.get(a.uid) || 0));

      return cards;
    },
    [favoriteProducts, fulfillment?.cooperative],
    { execute: searchText.length < 2 },
  );

  // Search products
  const {
    isLoading: isSearching,
    data: searchResults,
    error: searchError,
  } = usePromise(
    async (query: string, region: string | undefined, categoryFilter: string | null) => {
      if (!query || query.length < 2) return null;

      const filters = categoryFilter ? { category: [categoryFilter] } : undefined;
      const result = await withValidToken((token) =>
        searchProduct(query, token, preferences.language, region || "national", filters),
      );

      // Update available categories from search result (only when no filter applied)
      if (!categoryFilter && result.categories) {
        setAvailableCategories(result.categories);
      }

      // Get product cards for the found product IDs
      if (result.productIds && result.productIds.length > 0) {
        const cards = await withValidToken((token) =>
          getProductCards(
            {
              productFilter: { uids: result.productIds!.slice(0, 20) },
              language: preferences.language,
              offerFilter: {
                region: region || "national",
                storeType: "OFFLINE",
              },
            },
            token,
          ),
        );
        return cards;
      }
      return [];
    },
    [searchText, fulfillment?.cooperative, selectedCategory],
    { execute: searchText.length >= 2 },
  );

  // Fetch stores based on zip code (cached for 1 week)
  const { data: stores } = usePromise(
    async (zipCode: string) => {
      if (!zipCode) return [];
      return await getStoresForZip(zipCode, MAX_STORES);
    },
    [preferences.zipCode],
    { execute: !!preferences.zipCode },
  );

  // Fetch product availability when a product is highlighted
  const { data: productAvailability, isLoading: isLoadingAvailability } = usePromise(
    async (productId: string | null, storeList: StoreInfo[] | undefined) => {
      if (!productId || !storeList || storeList.length === 0) return null;

      const costCenterIds = storeList.map((s) => s.costCenterId || s.storeId || "").filter(Boolean);

      if (costCenterIds.length === 0) return null;

      const supply: ProductSupply = await withValidToken((token) =>
        getProductSupply(productId, costCenterIds as string[], token),
      );

      return supply;
    },
    [highlightedProductId, stores],
    { execute: !!highlightedProductId && !!stores && stores.length > 0 },
  );

  // Build store availability list with preferred store first
  const storeAvailabilities: StoreAvailability[] = [];
  if (stores && productAvailability?.availabilities) {
    for (const store of stores) {
      const storeId = store.costCenterId || store.storeId || "";
      const availability = productAvailability.availabilities.find((a) => a.id === storeId);
      storeAvailabilities.push({
        store,
        stock: availability?.stock ?? 0,
        isPreferred: storeId === preferredStoreId,
      });
    }
    // Sort: preferred store first, then by stock descending
    storeAvailabilities.sort((a, b) => {
      if (a.isPreferred && !b.isPreferred) return -1;
      if (!a.isPreferred && b.isPreferred) return 1;
      const stockA = typeof a.stock === "string" ? parseInt(a.stock, 10) : a.stock;
      const stockB = typeof b.stock === "string" ? parseInt(b.stock, 10) : b.stock;
      return (stockB || 0) - (stockA || 0);
    });
  }

  // Handler to set preferred store
  const handleSetPreferred = useCallback(
    async (storeId: string) => {
      await LocalStorage.setItem(PREFERRED_STORE_KEY, storeId);
      setPreferredStoreId(storeId);
      await showToast({ style: Toast.Style.Success, title: "Preferred store saved" });
    },
    [preferences.language],
  );

  // Handler to toggle favorite
  const handleToggleFavorite = useCallback(
    async (product: ProductCard) => {
      // Use functional update to always work with latest state
      setFavoriteProducts((currentFavorites) => {
        const isCurrentlyFavorite = currentFavorites.some((f) => f.uid === product.uid);
        let newFavorites: FavoriteProduct[];

        if (isCurrentlyFavorite) {
          newFavorites = currentFavorites.filter((f) => f.uid !== product.uid);
          showToast({ style: Toast.Style.Success, title: "Removed from Favorites" });
        } else {
          const favoriteData: FavoriteProduct = {
            uid: product.uid,
            migrosId: product.migrosId,
            name: product.name,
            brand: product.brand,
            productUrls: product.productUrls,
            thumbnailUrl: getProductImageUrl(product, "thumbnail"),
            favoritedAt: Date.now(),
          };
          newFavorites = [...currentFavorites, favoriteData];
          showToast({ style: Toast.Style.Success, title: "Added to Favorites" });
        }

        // Persist to LocalStorage (fire and forget)
        LocalStorage.setItem(FAVORITE_PRODUCTS_KEY, JSON.stringify(newFavorites));

        return newFavorites;
      });
    },
    [preferences.language],
  );

  // Check if a product is a favorite
  const isProductFavorite = useCallback(
    (productUid: number) => favoriteProducts.some((f) => f.uid === productUid),
    [favoriteProducts],
  );

  // Handler for search text change - reset category filter
  const handleSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    setSelectedCategory(null);
    setAvailableCategories([]);
  }, []);

  // Build mapping from item keys to product UIDs for clean lookup in onSelectionChange
  const itemKeyToProductUid = useMemo(() => {
    const map = new Map<string, string>();

    // Search results: key is uid, maps to uid
    searchResults?.forEach((p) => map.set(String(p.uid), String(p.uid)));

    // Favorites: key is "favorite-{uid}", maps to uid
    favoriteProductCards?.forEach((p) => map.set(`favorite-${p.uid}`, String(p.uid)));

    // Promotions: key is "promo-{promoId}-{uid}", maps to uid
    promotionsData?.promotionDetails.forEach((promo) => {
      const product = promotionsData.products.find((p) => p.uid === promo.productIds[0]);
      if (product) {
        map.set(`promo-${promo.id}-${product.uid}`, String(product.uid));
      }
    });

    return map;
  }, [searchResults, favoriteProductCards, promotionsData]);

  // Show error toast
  if (searchError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Search failed",
      message: String(searchError),
    });
  }

  return (
    <List
      isLoading={isSearching || isLoadingAvailability || isLoadingPromotions || isLoadingFavorites}
      isShowingDetail
      searchBarPlaceholder="Search Migros products..."
      onSearchTextChange={handleSearchTextChange}
      onSelectionChange={(id) => {
        if (!id) {
          setHighlightedProductId(null);
          return;
        }
        setHighlightedProductId(itemKeyToProductUid.get(id) ?? null);
      }}
      searchBarAccessory={
        availableCategories.length > 0 ? (
          <List.Dropdown
            tooltip="Filter by Category"
            value={selectedCategory || "all"}
            onChange={(value) => setSelectedCategory(value === "all" ? null : value)}
          >
            <List.Dropdown.Item title="All Categories" value="all" />
            <List.Dropdown.Section title="Categories">
              {availableCategories.map((cat) => (
                <List.Dropdown.Item
                  key={cat.id}
                  title={`${cat.name} (${cat.numberOfProducts})`}
                  value={String(cat.id)}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
      throttle
    >
      {searchText.length >= 2 ? (
        // Search results
        searchResults && searchResults.length === 0 ? (
          <List.EmptyView
            icon={Icon.XMarkCircle}
            title="No products found"
            description={`No results for "${searchText}"`}
          />
        ) : (
          searchResults?.map((product) => (
            <ProductListItem
              key={product.uid}
              itemKey={product.uid}
              product={product}
              storeAvailabilities={storeAvailabilities}
              onSetPreferred={handleSetPreferred}
              isHighlighted={String(product.uid) === highlightedProductId}
              isFavorite={isProductFavorite(product.uid)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))
        )
      ) : (
        // Favorites and Promotions view when no search text
        <>
          {favoriteProductCards && favoriteProductCards.length > 0 && (
            <List.Section title="Favorites">
              {favoriteProductCards.map((product) => (
                <ProductListItem
                  key={`favorite-${product.uid}`}
                  itemKey={`favorite-${product.uid}`}
                  product={product}
                  storeAvailabilities={storeAvailabilities}
                  onSetPreferred={handleSetPreferred}
                  isHighlighted={String(product.uid) === highlightedProductId}
                  isFavorite={true}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </List.Section>
          )}
          {promotionsData?.promotionDetails && promotionsData.promotionDetails.length > 0 && (
            <List.Section title="Promotions">
              {promotionsData.promotionDetails.map((promo) => {
                const firstProductId = promo.productIds[0];
                const firstProduct = promotionsData.products.find((p) => p.uid === firstProductId);
                if (!firstProduct) return null;

                return (
                  <ProductListItem
                    key={promo.id}
                    itemKey={`promo-${promo.id}-${firstProduct.uid}`}
                    product={firstProduct}
                    storeAvailabilities={storeAvailabilities}
                    onSetPreferred={handleSetPreferred}
                    isHighlighted={String(firstProduct.uid) === highlightedProductId}
                    subtitle={firstProduct.brand}
                    isFavorite={isProductFavorite(firstProduct.uid)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
