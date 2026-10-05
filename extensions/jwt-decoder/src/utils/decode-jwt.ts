import * as jose from "jose";
import { ListFromObject, TokenItem } from "./list-from-object";

export type DecodedJwt = {
  header: jose.ProtectedHeaderParameters;
  data: jose.JWTPayload;
  headerItems: TokenItem[];
  dataItems: TokenItem[];
};

export function decodeJwtWithItems(clipboard: string, claims: Array<string[]> | undefined): DecodedJwt {
  const header = jose.decodeProtectedHeader(clipboard);
  const data = jose.decodeJwt(clipboard);
  const headerItems = ListFromObject(header, claims);
  const dataItems = ListFromObject(data, claims);

  return { header, data, headerItems, dataItems };
}
