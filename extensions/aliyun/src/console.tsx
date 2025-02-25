import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useState } from "react";
import categoriesAndProducts from "../metadata/categories_n_products.json";
import { searchProducts } from "./utils/search";

interface Product {
  productId: string;
  name: string;
  link: string;
  pinyin: string;
  keywords: string[];
  tag: string;
  docId?: string;
  inNav: boolean;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const products = categoriesAndProducts.data.products.filter((p) => p.inNav !== false);

  // 使用 searchProducts 函数进行搜索
  const filteredProducts = searchProducts(products, searchText);

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Search Aliyun Products..." throttle>
      <List.Section title="Aliyun Products" subtitle={`${filteredProducts.length} items`}>
        {filteredProducts.map((product) => (
          <ProductListItem key={product.productId} product={product} onAction={() => {}} />
        ))}
      </List.Section>
    </List>
  );
}

function ProductListItem({ product, onAction }: { product: Product; onAction: () => void }) {
  const consoleUrl = `https://${product.link}`;
  const docUrl = product.docId ? `https://help.aliyun.com/document_detail/${product.docId}.html` : undefined;

  return (
    <List.Item
      title={product.name}
      subtitle={product.productId}
      accessories={[{ text: product.link }, { text: product.tag || undefined }]}
      icon={Icon.Globe}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Console" url={consoleUrl} onOpen={onAction} icon={Icon.Globe} />
            {docUrl && <Action.OpenInBrowser title="View Documentation" url={docUrl} icon={Icon.Document} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={consoleUrl} title="Copy Console URL" icon={Icon.Clipboard} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
