import { getPreferenceValues, environment } from "@raycast/api";
import { NugetPackage } from "./NugetPackage";
import { join } from "path";

export function randomString(length = 10): string {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function humanizeNumber(
  number: number,
  _notation: "standard" | "scientific" | "engineering" | "compact" | undefined = "compact"
): string {
  const formatter = Intl.NumberFormat("en", { notation: _notation });
  return formatter.format(number);
}

export interface FetchResponse<T> {
  fetchId?: string;
  data: T;
}

export function IsNugetPreviewChannelRequested() {
  const _preference = getPreferenceValues();
  const nugetChannel = _preference["nuget-channel"];

  return nugetChannel === "preview";
}

export function GetCommandForCli(_package: NugetPackage) {
  const _preference = getPreferenceValues();
  switch (_preference["command-to-copy"]) {
    case "package-manager":
      return `Install-Package ${_package.id} -Version ${_package.version}`;
    case "dotnet-cli":
      return `dotnet add package ${_package.id} --version ${_package.version}`;
    case "package-reference":
      return `<PackageReference Include="${_package.id}" Version="${_package.version}" />`;
    case "packet-cli":
      return `packet add ${_package.id} --version ${_package.version}`;
    default:
      return `dotnet add package ${_package.id} --version ${_package.version}`;
  }
}

export function cachedImage(url: string): string {
  if (!url) return join(environment.assetsPath, "icon.png");
  return url;
}
