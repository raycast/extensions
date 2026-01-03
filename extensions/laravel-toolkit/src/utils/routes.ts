import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface Route {
  domain: string | null;
  method: string;
  uri: string;
  name: string | null;
  action: string;
  middleware: string[];
}

export async function getRoutes(projectPath: string, filterVal = ""): Promise<Route[]> {
  try {
    const { stdout } = await execAsync(`php artisan route:list --json`, {
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 5,
    });
    let routes: Route[] = JSON.parse(stdout);

    // Normalize middleware if it's not an array (older laravel versions might differ, but usually array)
    // Sometimes middleware is a string in older versions? NO, typically array.

    if (filterVal) {
      const lower = filterVal.toLowerCase();
      routes = routes.filter(
        (r) =>
          r.uri.toLowerCase().includes(lower) ||
          (r.name && r.name.toLowerCase().includes(lower)) ||
          r.action.toLowerCase().includes(lower),
      );
    }

    return routes;
  } catch (error) {
    console.error("Failed to fetch routes", error);
    return [];
  }
}
