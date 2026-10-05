import { primitivesRoutes } from "../repository/utils/primitivesRoutes.ts";
import { themesRoutes } from "../repository/utils/themesRoutes.ts";
import { colorsRoutes } from "../repository/utils/colorsRoutes.ts";

const product = process.argv[2];

let routes;
switch (product) {
  case "primitives":
    routes = primitivesRoutes;
    break;
  case "themes":
    routes = themesRoutes;
    break;
  case "colors":
    routes = colorsRoutes;
    break;
  default:
    console.error(`Unknown product: ${product}`);
    process.exit(1);
}

process.stdout.write(JSON.stringify(routes));
