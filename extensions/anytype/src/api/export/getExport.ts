import { Export, ExportFormat } from "../../models";
import { apiEndpoints, apiFetch } from "../../utils";

export async function getExport(spaceId: string, objectId: string, format: ExportFormat): Promise<Export> {
  const { url, method } = apiEndpoints.getExport(spaceId, objectId, format);
  const response = await apiFetch<Export>(url, { method: method });
  return response.payload;
}
