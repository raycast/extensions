import React from "react";
import {
  ActionPanel,
  Action,
  Icon,
  Color,
  open,
  showToast,
  Toast,
  Keyboard,
  openExtensionPreferences,
} from "@raycast/api";
import { Product, User } from "../types";
import { ProductDetailView } from "./ProductDetailView";
import { ProductGalleryView } from "./ProductGalleryView";
import { FrontpageWrapper } from "./FrontpageWrapper";
import { TopicsAction } from "./TopicsAction";
import { RELOAD_EXTENSIONS_DEEPLINK } from "../constants";

type SubmenuType = React.ComponentType<{
  title: string;
  children: React.ReactNode;
}>;

/**
 * Enum to specify the context in which ProductActions is being used
 */
export enum ViewContext {
  List = "list",
  Detail = "detail",
}

interface ProductActionsProps {
  product: Product;
  validGalleryImages?: string[];
  index?: number;
  totalProducts?: number;
  allProducts?: Product[];
  onNavigateToProduct?: (product: Product, newIndex: number) => void;
  viewContext: ViewContext;
  showTopics?: boolean;
  onRefresh?: () => void;
}

export function ProductActions({
  product,
  validGalleryImages = [],
  index,
  totalProducts,
  allProducts = [],
  onNavigateToProduct,
  viewContext,
  showTopics = true,
  onRefresh,
}: ProductActionsProps) {
  const handleUserAction = (user: User, role: string) => {
    if (user.profileUrl) {
      showToast({
        style: Toast.Style.Success,
        title: `Opening ${role} profile: ${user.name}`,
      });
      open(user.profileUrl);
    }
  };

  return (
    <ActionPanel>
      {/* Primary Actions Section */}
      <ActionPanel.Section>
        {/* For feed items the in-app detail view has no real data, so Open in Browser is primary */}
        {product.isFeedFallback ? (
          <Action.OpenInBrowser url={product.url} title="Open in Browser" />
        ) : (
          <>
            {/* In List view, first action is View Details */}
            {viewContext === ViewContext.List && (
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={
                  <ProductDetailView
                    product={product}
                    index={index}
                    totalProducts={totalProducts || allProducts.length}
                    onNavigateToProduct={onNavigateToProduct}
                  />
                }
              />
            )}

            {/* In Detail view, first action is Open in Browser */}
            <Action.OpenInBrowser
              url={product.url}
              title="Open in Browser"
              shortcut={viewContext === ViewContext.Detail ? undefined : Keyboard.Shortcut.Common.Open}
            />
          </>
        )}

        {/* Copy URL action */}
        <Action.CopyToClipboard
          title="Copy URL"
          content={product.url}
          shortcut={viewContext === ViewContext.List ? Keyboard.Shortcut.Common.Copy : undefined}
        />

        {/* Gallery action - available in both views if gallery images exist */}
        {validGalleryImages.length > 0 && (
          <Action.Push
            title="View Gallery"
            icon={Icon.AppWindowGrid2x2}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            target={<ProductGalleryView product={product} />}
          />
        )}

        {/* Previous Launches action - only show if there are previous launches */}
        {product.previousLaunches && product.previousLaunches > 0 && product.productHubUrl && (
          <Action.OpenInBrowser
            icon={Icon.Hourglass}
            title={product.previousLaunches === 1 ? "View Previous Launch" : "View Previous Launches"}
            url={product.productHubUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
        )}

        {/* Refresh action - re-fetches the frontpage with fresh data when provided */}
        {onRefresh && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        )}
      </ActionPanel.Section>

      {/* Topics Section */}
      {showTopics && product.topics && product.topics.length > 0 && (
        <TopicsAction topics={product.topics} showAsSubmenu={true} />
      )}

      {/* People Section */}
      {(product.hunter || (product.makers && product.makers.length > 0)) && (
        <React.Fragment>
          {(() => {
            const Submenu = ActionPanel.Submenu as SubmenuType;
            return (
              <Submenu title="View People">
                {/* Hunter */}
                {product.hunter && (
                  <Action
                    title={`Hunter: ${product.hunter.name}`}
                    icon={{ source: Icon.Person, tintColor: Color.Orange }}
                    onAction={() => handleUserAction(product.hunter!, "hunter")}
                  />
                )}

                {/* Makers */}
                {product.makers &&
                  product.makers.map((maker) => (
                    <Action
                      key={maker.id || maker.username}
                      title={`Maker: ${maker.name}`}
                      icon={{ source: Icon.Person, tintColor: Color.Purple }}
                      onAction={() => handleUserAction(maker, "maker")}
                    />
                  ))}
              </Submenu>
            );
          })()}
        </React.Fragment>
      )}

      {/* Navigation Actions - only show in Detail view */}
      {viewContext === ViewContext.Detail && typeof index === "number" && totalProducts && onNavigateToProduct && (
        <ActionPanel.Section title="Navigation">
          {index > 0 && (
            <Action
              title="Previous Product"
              icon={Icon.ArrowLeft}
              shortcut={{ key: "arrowLeft", modifiers: [] }}
              onAction={() => {
                if (onNavigateToProduct) {
                  onNavigateToProduct(product, index - 1);
                }
              }}
            />
          )}
          {index < totalProducts - 1 && (
            <Action
              title="Next Product"
              icon={Icon.ArrowRight}
              shortcut={{ key: "arrowRight", modifiers: [] }}
              onAction={() => {
                if (onNavigateToProduct) {
                  onNavigateToProduct(product, index + 1);
                }
              }}
            />
          )}
          {/* Action to go back to the frontpage */}
          <Action.Push
            title="Back to Featured Products"
            icon={Icon.ArrowUp}
            target={<FrontpageWrapper />}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
          />
        </ActionPanel.Section>
      )}

      {/* Settings Section - always available so users can add/update API credentials */}
      <ActionPanel.Section title="Settings">
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        {/* Reload is the only way to apply just-edited API keys: prefs are snapshotted at launch, so a
            running command (and its Refresh) keeps using the old credentials until the process restarts. */}
        <Action
          title="Reload Extension"
          icon={Icon.RotateClockwise}
          onAction={() => open(RELOAD_EXTENSIONS_DEEPLINK)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
