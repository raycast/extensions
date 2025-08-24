declare module "svg-to-jsx" {
  export type SvgToJsxOptions = Partial<{
    passProps: boolean;
    passChildren: boolean;
    root: string;
    refs: Record<string, string>;
  }>;

  export type SvgToJsxCallback = (err: unknown | null, result: string | null) => void;

  export default function svgtojsx(svg: string): Promise<string>;
  export default function svgtojsx(svg: string, callback: SvgToJsxCallback): Promise<string>;
  export default function svgtojsx(
    svg: string,
    options: SvgToJsxOptions,
    callback: SvgToJsxCallback | undefined
  ): Promise<string>;
}
