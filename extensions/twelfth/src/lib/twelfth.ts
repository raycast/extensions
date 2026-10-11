import { twelfthTools } from "../vendor/twelfth-shared/index";
import { callTool } from "./mcp";

export {
  PRODUCT_SORTS,
  type Action,
  type Figure,
  type Product,
  type ProductPage,
  type ProductSort,
  type Project,
  type ProjectState,
  type Workspace,
} from "../vendor/twelfth-shared/index";

export const { getWorkspace, listOpenActions, listProducts, listProjects } = twelfthTools(callTool);
