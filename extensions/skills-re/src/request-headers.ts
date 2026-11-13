import packageJson from "../package.json";

interface BuildApiRequestHeadersInput {
  hasBody: boolean;
  token?: string;
}

const raycastApiVersion = packageJson.dependencies["@raycast/api"];
const userAgent = `${packageJson.name}/raycast-extension RaycastAPI/${raycastApiVersion}`;

export const buildApiRequestHeaders = ({ hasBody, token }: BuildApiRequestHeadersInput) => ({
  Accept: "application/json",
  ...(hasBody ? { "Content-Type": "application/json" } : {}),
  "User-Agent": userAgent,
  ...(token ? { "x-api-key": token } : {}),
});
