import { Connector } from "@google-cloud/cloud-sql-connector";
import mysql from "mysql2/promise";

export default async function main() {
  const connector = new Connector();
const clientOpts = await connector.getOptions({
  instanceConnectionName: 'beamy-prod:europe-west1:core-database-prod',
});
const pool = await mysql.createPool({
  ...clientOpts,
  user: 'db-user',
  password: 'db-password',
  database: 'db-name',
});
const conn = await pool.getConnection();
const [result] = await conn.query(`SELECT NOW();`);
console.table(result); // prints returned time value from server

await pool.end();
connector.close();
}
