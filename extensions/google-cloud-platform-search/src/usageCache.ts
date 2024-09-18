import { Cache } from "@raycast/api";
import { ConsoleProductWithLowerName, ProductUsage, Project, ProjectUsage } from "./types";
import { consoleProducts } from "./consoleProducts";

const CACHE = new Cache();

const PROJECTS_CACHE_KEY = "projects";
const PRODUCTS_CACHE_KEY = "products";
const LAST_UPDATE_CACHE_KEY = "lastUpdateDay";

// A decay factor of 0.9 means that a usage for a project and product will decay by
// - 50% after 7 days
// - 90% after 22 days
const DECAY_FACTOR = 0.9;

// Due to the decay factor, projects and products that aren't used frequently anymore would fall in score
// indefinitely, so we prune them when they fall below a meaningful threshold to reduce cache usage.
const PRUNE_THRESHOLD = 0.1;

// Global variable to store the project usage, useful to avoid reading from the cache for each search keystroke,
// since we are using custom filtering and sorting
let projectUsage: ProjectUsage | undefined = undefined;

// Global variable to store the products sorted by usage in the selected project.
// Useful to avoid reading from the cache for each search keystroke, since we are using custom filtering and sorting.
let sortedProducts = {
  products: [] as ConsoleProductWithLowerName[],
  projectId: "",
};

export function sortProjectsByUsage(projects: Project[]) {
  if (!projectUsage) {
    const cacheContent = CACHE.get(PROJECTS_CACHE_KEY);
    projectUsage = cacheContent ? JSON.parse(cacheContent) : {};
  }

  return projects.sort((a, b) => (projectUsage![b.projectId] ?? 0) - (projectUsage![a.projectId] ?? 0));
}

export function getProductsByUsage(projectId: string) {
  if (sortedProducts.projectId !== projectId) {
    const cacheContent = CACHE.get(PRODUCTS_CACHE_KEY);
    const decoded: ProductUsage = cacheContent ? JSON.parse(cacheContent) : {};
    const productFrequencies: { [productName: string]: number } = decoded[projectId] ?? {};

    const sortedConsoleProducts = consoleProducts.sort(
      (a, b) => (productFrequencies[b.name] ?? 0) - (productFrequencies[a.name] ?? 0),
    );

    sortedProducts = {
      products: sortedConsoleProducts.map((product) => {
        return {
          ...product,
          lowerName: product.name.toLowerCase(),
        };
      }),
      projectId,
    };
  }
  return sortedProducts.products;
}

/**
 * Update the usage of a project and optionally a product.
 * Increase the frequency of usage of the project and the product in the cache.
 */
export function updateUsage(projectId: string, productName?: string) {
  applyDecay();

  updateProjectUsage(projectId);
  if (productName) {
    updateProductUsage(projectId, productName);
  }
}
function updateProductUsage(projectId: string, productName: string) {
  const cacheContent = CACHE.get(PRODUCTS_CACHE_KEY);
  const decoded = (cacheContent ? JSON.parse(cacheContent) : {}) as ProductUsage;
  const projectUsage: { [productName: string]: number } = decoded[projectId] ?? {};

  const currentFrequency = projectUsage[productName] ?? 0;
  projectUsage[productName] = currentFrequency + 1;
  decoded[projectId] = projectUsage;

  CACHE.set(PRODUCTS_CACHE_KEY, JSON.stringify(decoded));

  // Invalidate the local variable to force reading from the updated cache next time
  sortedProducts = { products: [], projectId: "" };
}

function updateProjectUsage(projectId: string) {
  if (!projectUsage) {
    const cacheContent = CACHE.get(PROJECTS_CACHE_KEY);
    projectUsage = cacheContent ? (JSON.parse(cacheContent) as ProjectUsage) : {};
  }

  const currentFrequency = projectUsage[projectId] ?? 0;
  projectUsage[projectId] = currentFrequency + 1;

  CACHE.set(PROJECTS_CACHE_KEY, JSON.stringify(projectUsage));
}

function applyDecayToProducts(decay: number) {
  const productsCacheContent = CACHE.get(PRODUCTS_CACHE_KEY);

  const decoded: ProductUsage = productsCacheContent ? JSON.parse(productsCacheContent) : {};

  for (const projectId in decoded) {
    for (const productName in decoded[projectId]) {
      decoded[projectId][productName] *= decay;

      if (decoded[projectId][productName] < PRUNE_THRESHOLD) {
        delete decoded[projectId][productName];
      }
    }

    // If all products were pruned from a project, remove it from the cache as well
    if (Object.keys(decoded[projectId]).length === 0) {
      delete decoded[projectId];
    }
  }

  CACHE.set(PRODUCTS_CACHE_KEY, JSON.stringify(decoded));
}

function applyDecayToProjects(decay: number) {
  const projectsCacheContent = CACHE.get(PROJECTS_CACHE_KEY);
  const decodedProjects: ProjectUsage = projectsCacheContent ? JSON.parse(projectsCacheContent) : {};

  for (const projectId in decodedProjects) {
    decodedProjects[projectId] *= decay;

    if (decodedProjects[projectId] < PRUNE_THRESHOLD) {
      delete decodedProjects[projectId];
    }
  }

  CACHE.set(PROJECTS_CACHE_KEY, JSON.stringify(decodedProjects));
}

/**
 * Apply a time-based decay factor to the usage of the products and projects.
 * The decay factor is calculated based on the difference in days from the last cache update.
 */
function applyDecay() {
  // Current date as YYYY-MM-DD
  const today = new Date().toISOString().split("T")[0];
  const lastUpdate = CACHE.get(LAST_UPDATE_CACHE_KEY);

  // If we already applied the decay today, skip
  if (lastUpdate === today) {
    return;
  } else if (!lastUpdate) {
    // Initialize cache for the first time
    CACHE.set(LAST_UPDATE_CACHE_KEY, today);
    return;
  }

  // Parse the date from the cache in format YYYY-MM-DD
  const lastUpdateDate = new Date(lastUpdate);

  // Calculate the difference in days from today
  const diffTime = Math.max(new Date().getTime() - lastUpdateDate.getTime(), 0);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const decay = Math.pow(DECAY_FACTOR, diffDays);

  applyDecayToProducts(decay);
  // Invalidate the local variable to force reading from the decayed cache next time
  sortedProducts = { products: [], projectId: "" };

  // Invalidate the local variable to force reading from the decayed cache next time
  applyDecayToProjects(decay);
  projectUsage = undefined;

  // Update the last update day
  CACHE.set(LAST_UPDATE_CACHE_KEY, today);
}
