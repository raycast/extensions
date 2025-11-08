import { type ComponentType } from "react";
import StoreEditor from "../components/store-editor";
import { useStores } from "../providers/stores-provider/stores-provider";

/**
 * This config is only used when wrapping a component with `withStores`. It is not exposed to parent or wrapped components.
 */
export interface WithStoresConfig {
  showEditorOnEmpty?: boolean;
}

export const withStores = <TProps extends object>(
  Component: ComponentType<TProps>,
  { showEditorOnEmpty = true }: WithStoresConfig = {},
): ComponentType<TProps> => {
  const WithStoresComponent = (props: TProps) => {
    const { stores } = useStores();

    if (showEditorOnEmpty && stores.length === 0) {
      return <StoreEditor />;
    }
    return <Component {...props} />;
  };
  WithStoresComponent.displayName = `WithStores(${Component.displayName || Component.name})`;

  return WithStoresComponent;
};
