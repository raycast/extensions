declare module "swift:../swift/display-helper" {
  interface DisplayInfo {
    id: number;
    name: string;
    uuid: string;
    isMain: boolean;
    isBuiltIn: boolean;
    width: number;
    height: number;
    availableMethods: string[];
    hasMultipleRefreshRates: boolean;
    recommendedMethod: string;
  }

  export function getAllDisplays(): Promise<DisplayInfo[]>;
  export function reinitializeDisplay(
    displayId: number,
    method: string,
  ): Promise<string>;
}
