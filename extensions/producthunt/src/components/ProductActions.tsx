import React from "react";
import { ActionPanel, Action, Icon, Color, open, showToast, Toast } from "@raycast/api";
import { Product, User } from "../types";
import { ProductDetailView } from "./ProductDetailView";
import { ProductGalleryView } from "./ProductGalleryView";
import { FrontpageWrapper } from "./FrontpageWrapper";
import { TopicsAction } from "./TopicsAction";

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
          shortcut={viewContext === ViewContext.Detail ? undefined : { modifiers: ["cmd"], key: "o" }}
        />

        {/* Copy URL action */}
        <Action.CopyToClipboard
          title="Copy URL"
          content={product.url}
          shortcut={{ modifiers: ["cmd"], key: viewContext === ViewContext.List ? "c" : "o" }}
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
    </ActionPanel>
  );
}
