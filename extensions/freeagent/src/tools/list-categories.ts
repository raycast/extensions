import { fetchCategories } from "../services/freeagent";
import { provider } from "../oauth";

/**
 * List all available categories in FreeAgent for transaction explanations
 */
export default async function tool() {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    const categories = await fetchCategories(token);

    if (categories.length === 0) {
      return "❌ No categories found in your FreeAgent account.";
    }

    let result = `📂 **Available FreeAgent Categories**\n\n`;
    result += `Found ${categories.length} categories:\n\n`;

    // Group categories by their group_description for better organization
    const groupedCategories = categories.reduce(
      (acc, category) => {
        const group = category.group_description || "Other";
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(category);
        return acc;
      },
      {} as Record<string, typeof categories>,
    );

    // Display categories grouped by type
    for (const [groupName, groupCategories] of Object.entries(groupedCategories)) {
      result += `**${groupName}:**\n`;

      groupCategories.forEach((category) => {
        result += `• **${category.description}** (${category.nominal_code})\n`;
        result += `  URL: \`${category.url}\`\n`;
        if (category.allowable_for_tax) {
          result += `  💸 Tax allowable\n`;
        }
        result += `\n`;
      });
    }

    result += `\n💡 **Usage:**\n`;
    result += `• Copy the URL from the category you want to use\n`;
    result += `• Use it in the add-bank-transaction-explanation tool as the categoryUrl parameter\n`;
    result += `• Example: \`categoryUrl: "https://api.freeagent.com/v2/categories/123"\`\n`;

    return result;
  } catch (error) {
    console.error("List categories error:", error);

    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        return `❌ Authentication failed. Please re-authenticate with FreeAgent.`;
      }
    }

    return `❌ Unable to fetch categories. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
