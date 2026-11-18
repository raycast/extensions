import * as path from "node:path";
export type TargetPreference = "auto" | "production" | "internal";
export function resolveTargetApp(
  preference: TargetPreference,
  home: string,
  exists: (path: string) => boolean,
) {
  const appPath = (name: string) =>
    ["/Applications", path.join(home, "Applications")]
      .map((root) => path.join(root, `${name}.app`))
      .find(exists);
  const internal = appPath("Glaze Internal");
  const useInternal =
    preference === "internal" || (preference === "auto" && !!internal);
  const name = useInternal ? "Glaze Internal" : "Glaze";
  const location = useInternal ? internal : appPath("Glaze");
  return {
    name,
    bundleId: useInternal
      ? "app.glaze.macos.main.internal"
      : "app.glaze.macos.main",
    scheme: useInternal ? ("glaze-internal" as const) : ("glaze" as const),
    folderName: useInternal ? "Glaze (Internal)" : "Glaze",
    appPath: location ?? `/Applications/${name}.app`,
    installed: !!location,
  };
}
