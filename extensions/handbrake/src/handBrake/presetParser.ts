export type PresetGroup = {
  category: string;
  presets: string[];
};

export function parsePresetOutput(output: string): PresetGroup[] {
  const lines = output.split("\n");
  const results: PresetGroup[] = [];

  let currentCategory: string | null = null;
  let currentPresets: string[] = [];

  const categoryRegex = /^([\w\s]+)\/\s*$/;
  const presetLineRegex = /^ {4}(?! ).+/; // preset names start at exactly 4 spaces

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect category
    const categoryMatch = line.match(categoryRegex);
    // Push previous results
    if (categoryMatch) {
      pushPreset();
      currentCategory = categoryMatch[1].trim();
      currentPresets = [];
      continue;
    }

    if (presetLineRegex.test(line)) {
      const preset = line.trim();
      if (currentPresets.includes(preset)) {
        console.log(`Found duplicate preset ${preset} in category ${currentCategory}`);
      } else {
        currentPresets.push(preset);
      }
    }
  }

  // Push the last group
  pushPreset();

  function pushPreset() {
    if (currentCategory && currentPresets.length > 0) {
      results.push({ category: currentCategory, presets: currentPresets });
    }
  }

  return results;
}
