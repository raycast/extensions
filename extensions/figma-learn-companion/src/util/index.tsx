export enum FigmaColors {
    Purple = "#CAB8FF",
    Yellow = "#FFC700",
}

/**
 * Takes a string and returns an array of mentioned products in that string, if nothing is found, it returns a fallback product if provided
 * @param text The text to search for mentioned products
 * @returns An array of mentioned products
 */
export function identifyMentionedProducts(text: string, fallback?: string): string[] {
    const products = ["Figma", "FigJam", "Dev Mode"];
    const mentionedProducts = products.filter((product) => text.toLowerCase().includes(product.toLowerCase()));
    if (mentionedProducts.length === 0 && fallback) {
        return [fallback];
    }
    return mentionedProducts;
}
