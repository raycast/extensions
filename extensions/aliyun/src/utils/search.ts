interface Product {
  productId: string;
  name: string;
  pinyin: string;
  keywords: string[];
  link: string;
  tag: string;
  docId: string | undefined;
  pipId: string | null;
  inNav: boolean;
}

/**
 * Search products
 * @param products Product list
 * @param keyword Search keyword
 * @returns Matched product list
 */
export function searchProducts(products: Product[], keyword: string): Product[] {
  // Convert to lowercase for case-insensitive search
  const lowerKeyword = keyword.toLowerCase().trim();

  if (!lowerKeyword) {
    return products;
  }

  return products.filter((product) => {
    // 匹配产品ID
    if (product.productId.toLowerCase().includes(lowerKeyword)) {
      return true;
    }

    // 匹配产品名称
    if (product.name.toLowerCase().includes(lowerKeyword)) {
      return true;
    }

    // 匹配拼音 - 支持部分匹配
    const pinyinWords = product.pinyin.toLowerCase().split(/\s+/);
    if (pinyinWords.some((word) => word.includes(lowerKeyword))) {
      return true;
    }

    // 匹配关键词
    if (product.keywords?.some((k) => k.toLowerCase().includes(lowerKeyword))) {
      return true;
    }

    return false;
  });
}

/**
 * Highlight matched text
 * @param text Original text
 * @param keyword Keyword
 * @returns Text with highlight markers
 */
export function highlightText(text: string, keyword: string): string {
  if (!keyword.trim()) {
    return text;
  }

  const regex = new RegExp(`(${keyword})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}
