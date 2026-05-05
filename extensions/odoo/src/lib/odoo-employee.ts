import { authenticate, executeKw, normalizeBaseUrl, OdooRpcError } from "./odoo-jsonrpc";
import { ODOO_DATABASE_NAME, ODOO_INSTANCE_URL } from "./odoo-internal-config";

/** Same shape as Raycast extension prefs (email + password / API key). */
export type MindnowOdooCredentials = {
  email: string;
  password: string;
};

export type RpcContext = {
  baseUrl: string;
  database: string;
  uid: number;
  password: string;
};

type EmployeeRow = { id: number; name: string | false };

function employeeDisplayName(emp: EmployeeRow): string {
  if (typeof emp.name === "string" && emp.name.trim()) return emp.name;
  return `Employee #${emp.id}`;
}

/** Authenticate once; reuse for subsequent `execute_kw` calls. */
export async function authenticateRpcContext(creds: MindnowOdooCredentials): Promise<RpcContext> {
  const baseUrl = normalizeBaseUrl(ODOO_INSTANCE_URL);
  const database = ODOO_DATABASE_NAME;
  const uid = await authenticate(baseUrl, database, creds.email, creds.password);
  return { baseUrl, database, uid, password: creds.password };
}

/** Resolve `hr.employee` for the logged-in user (`user_id` = uid). */
export async function getEmployeeForRpcContext(ctx: RpcContext): Promise<{ id: number; name: string }> {
  const employees = await executeKw<EmployeeRow[]>(
    ctx.baseUrl,
    ctx.database,
    ctx.uid,
    ctx.password,
    "hr.employee",
    "search_read",
    [[["user_id", "=", ctx.uid]]],
    { fields: ["name"], limit: 1 },
  );

  if (!employees.length) {
    throw new OdooRpcError("No employee is linked to your Odoo user. Ask HR to link your user to an employee.");
  }

  const emp = employees[0];
  return { id: emp.id, name: employeeDisplayName(emp) };
}

export async function getEmployeeForCurrentUser(creds: MindnowOdooCredentials): Promise<{ id: number; name: string }> {
  const ctx = await authenticateRpcContext(creds);
  return getEmployeeForRpcContext(ctx);
}
