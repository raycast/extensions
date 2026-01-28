import { CiProductsApi, Configuration } from "../appstore-connect";
import { Product } from "../data/product";
import { generate } from "./token";

export async function fetchProducts(): Promise<Product[]> {
  const token = generate();

  const configuration = new Configuration();
  configuration.accessToken = token;
  const api = new CiProductsApi(configuration);
  const response = await api.ciProductsGetCollection(
    ["APP"],
    undefined,
    ["app", "createdDate", "name"],
    200,
    ["app"],
    undefined,
    undefined,
    ["name"],
    undefined,
    undefined,
    undefined
  );

  return response.data.data
    .map((product) => {
      const inner = response.data.included?.filter((item) => {
        return item.id == product.relationships?.app?.data?.id;
      })[0];
      if (inner === undefined) {
        return [];
      }
      if (inner.type !== "apps") {
        return [];
      }
      const name = (() => {
        if (inner.attributes?.name !== undefined && product.attributes?.name) {
          return `${inner.attributes.name} - ${product.attributes.name}`;
        } else {
          return "unknown";
        }
      })();
      return new Product(product.id, `${name}`);
    })
    .flat();
}
