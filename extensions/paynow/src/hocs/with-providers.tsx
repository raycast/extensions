import { type ComponentType } from "react";
import StoreProvider from "../providers/store-provider/store-provider";
import StoresProvider from "../providers/stores-provider/stores-provider";

export interface WithProvidersConfig<TProps extends object> {
  Fallback?: ComponentType<TProps>;
}

export const withProviders = <TProps extends object>(Component: ComponentType<TProps>): ComponentType<TProps> => {
  const WithProviders = (props: TProps) => {
    return (
      <StoresProvider>
        <StoreProvider>
          <Component {...props} />
        </StoreProvider>
      </StoresProvider>
    );
  };
  WithProviders.displayName = `WithProviders(${Component.displayName || Component.name})`;

  return WithProviders;
};
