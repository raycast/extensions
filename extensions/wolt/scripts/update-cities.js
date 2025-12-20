const { WoltClient } = require("wolt-api");
const fs = require("fs");
const path = require("path");

const CITIES_FILE = path.join(__dirname, "..", "cities.json");
const PACKAGE_JSON_PATH = path.join(__dirname, "..", "package.json");

async function fetchAndSaveCities() {
  try {
    const client = new WoltClient();
    const cities = await client.listCities();

    // Sort cities by name for better UX
    cities.sort((a, b) => a.name.localeCompare(b.name));

    // Generate dropdown data
    const dropdownData = cities.map((city) => ({
      title: `${city.name}, ${city.country_code_alpha2}`,
      value: city.slug,
    }));

    // Save cities data to separate JSON file
    fs.writeFileSync(CITIES_FILE, JSON.stringify(dropdownData, null, 2) + "\n");
    console.log(`✅ Saved ${cities.length} cities to cities.json`);

    return dropdownData;
  } catch (error) {
    console.error("❌ Failed to fetch cities:", error.message);
    throw error;
  }
}

function updatePackageJson(dropdownData) {
  try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));

    // Update the city preference
    const cityPreference = packageJson.preferences.find((p) => p.name === "citySlug");
    if (cityPreference) {
      cityPreference.data = dropdownData;
      // Set default to first city if not already set
      if (!cityPreference.default && dropdownData.length > 0) {
        cityPreference.default = dropdownData[0].value;
      }
    }

    // Write back to package.json
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + "\n");

    console.log(`✅ Updated package.json with cities dropdown`);
  } catch (error) {
    console.error("❌ Failed to update package.json:", error.message);
    throw error;
  }
}

async function updateCities() {
  try {
    // Check if cities.json exists, if so use it, otherwise fetch fresh
    let dropdownData;
    if (fs.existsSync(CITIES_FILE)) {
      console.log("📖 Reading cities from cities.json...");
      dropdownData = JSON.parse(fs.readFileSync(CITIES_FILE, "utf8"));
      console.log(`✅ Loaded ${dropdownData.length} cities from cities.json`);
    } else {
      console.log("🌐 Fetching cities from API...");
      dropdownData = await fetchAndSaveCities();
    }

    // Update package.json with the cities data
    updatePackageJson(dropdownData);
  } catch (error) {
    console.error("❌ Failed to update cities:", error.message);
    process.exit(1);
  }
}

updateCities();
