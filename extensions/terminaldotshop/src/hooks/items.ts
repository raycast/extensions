import { useTerminal } from "./auth";
import { useQuery } from "@tanstack/react-query";

export type Brew = {
  id: string;
  varId: string;
  title: string;
  subTitle: string;
  description: string;
  price: number;
  color: string;
  subscription?: "allowed" | "required" | string;
};

export const useProducts = () => {
  const terminal = useTerminal();
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const products = await terminal.product.list().then((d) => d.data);

      const out: Record<"featured" | "original" | "all", Brew[]> = {
        featured: [],
        original: [],
        all: [],
      };

      products.forEach((p) => {
        const featured = p.tags?.featured;
        const color = p.tags?.color ?? "#000000";

        if (featured) {
          out.featured.push({
            id: p.id,
            varId: p.variants[0].id,
            color,
            title: p.name,
            subTitle: p.variants[0].name,
            description: p.description,
            price: p.variants[0].price,
            subscription: p.subscription,
          });
        } else {
          out.original.push({
            id: p.id,
            varId: p.variants[0].id,
            color,
            title: p.name,
            subTitle: p.variants[0].name,
            description: p.description,
            price: p.variants[0].price,
            subscription: p.subscription,
          });
        }
      });

      out.all = [...out.featured, ...out.original];
      return out;
    },
  });
};
