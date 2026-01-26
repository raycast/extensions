// Type override to fix React 19 compatibility issues with @raycast/api
declare module "react" {
  export type ReactNode =
    | ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactNode[]
    | Promise<ReactNode>;
}

export {};
