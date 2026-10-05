import { listDatabaseClusters } from "../api/databases";

export default async function () {
  const response = await listDatabaseClusters();
  return response.data.map((db) => ({
    id: db.id,
    name: db.attributes.name,
    type: db.attributes.type,
    status: db.attributes.status,
    region: db.attributes.region,
    created_at: db.attributes.created_at,
  }));
}
