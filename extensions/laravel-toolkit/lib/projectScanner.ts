import { readdirSync, statSync, existsSync, readFileSync } from "fs";
import { join, basename } from "path";
import { sanitizePath } from "./pathValidator";

export interface DiscoveredProject {
  name: string;
  path: string;
}

/**
 * Checks if a directory is a Laravel project by looking for key files
 */
function isLaravelProject(dirPath: string): boolean {
  try {
    // Check for artisan file (required)
    const artisanPath = join(dirPath, "artisan");
    if (!existsSync(artisanPath)) {
      return false;
    }

    // Check for composer.json with Laravel dependency
    const composerPath = join(dirPath, "composer.json");
    if (existsSync(composerPath)) {
      try {
        // Safely read and parse composer.json without using require()
        const composerContentString = readFileSync(composerPath, "utf8");
        
        // Validate file size to prevent reading extremely large files
        if (composerContentString.length > 1024 * 1024) { // 1MB limit
          console.warn(`composer.json file is too large (${composerContentString.length} bytes), skipping: ${composerPath}`);
          // Continue with other checks instead of returning false
        } else {
          const composerContent = JSON.parse(composerContentString);
          
          // Validate that composerContent is an object
          if (composerContent && typeof composerContent === "object") {
            const dependencies = {
              ...(composerContent.require || {}),
              ...(composerContent["require-dev"] || {})
            };
            
            // Look for Laravel framework dependency
            if (dependencies["laravel/framework"]) {
              return true;
            }
          }
        }
      } catch (error) {
        // If composer.json is malformed or unreadable, continue with other checks
        console.warn(`Failed to parse composer.json at ${composerPath}:`, error);
      }
    }

    // Additional Laravel indicators
    const laravelIndicators = [
      "app/Http/Kernel.php",
      "config/app.php",
      "bootstrap/app.php"
    ];

    return laravelIndicators.some(indicator => 
      existsSync(join(dirPath, indicator))
    );
  } catch {
    return false;
  }
}

/**
 * Recursively scans a directory for Laravel projects
 */
export async function scanForLaravelProjects(
  rootPath: string, 
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<DiscoveredProject[]> {
  const projects: DiscoveredProject[] = [];

  // Validate and sanitize the root path
  const pathValidation = sanitizePath(rootPath);
  if (!pathValidation.isValid) {
    console.warn(`Invalid root path for scanning: ${pathValidation.error}`);
    return projects;
  }

  const sanitizedRootPath = pathValidation.sanitizedPath!;

  try {
    // Check if current directory is a Laravel project
    if (isLaravelProject(sanitizedRootPath)) {
      projects.push({
        name: basename(sanitizedRootPath),
        path: sanitizedRootPath
      });
      // Don't scan subdirectories if this is already a Laravel project
      return projects;
    }

    // If we haven't reached max depth, scan subdirectories
    if (currentDepth < maxDepth) {
      const entries = readdirSync(sanitizedRootPath);
      
      for (const entry of entries) {
        // Skip hidden directories and common non-project directories
        if (entry.startsWith('.') || 
            ['node_modules', 'vendor', '.git', 'dist', 'build'].includes(entry)) {
          continue;
        }

        const fullPath = join(sanitizedRootPath, entry);
        
        try {
          const stats = statSync(fullPath);
          if (stats.isDirectory()) {
            const subProjects = await scanForLaravelProjects(
              fullPath, 
              maxDepth, 
              currentDepth + 1
            );
            projects.push(...subProjects);
          }
        } catch {
          // Skip directories we can't access
          continue;
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return projects;
}