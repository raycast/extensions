export const parseSvgContent = (content: string, framework: "Vue" | "Svelte") => {
  if (content.includes("<?xml")) {
    content = content.replace(/<\?xml[^>]*\?>/i, "");
  }
  // Regular expression to match <style> tags in the SVG content
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;

  // Extract styles and store them in an array
  const styles = [];
  let matched;
  while ((matched = styleTagRegex.exec(content)) !== null) {
    styles.push(matched[1]); // Add the style content (not including the style tag)
  }

  // Remove <style> tags from the SVG content
  const templateContent = content.replace(styleTagRegex, "");

  const componentStyle = styles.length
    ? `<style${framework === "Vue" ? " scoped" : ""}>\n${styles.join("\n")}\n</style>`
    : "";

  return {
    componentStyle,
    templateContent,
  };
};
