/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pool, PoolClient, PoolConfig } from "pg";

export const createPool = (config: PoolConfig) => {
  return new Pool(config);
};

// Function to execute queries
export const query = async ({
  pool,
  sql,
  currentPage = 1,
  disabledPagination = false,
  pageSize = 10,
  params,
}: {
  pool: Pool;
  sql: string;
  currentPage?: number;
  pageSize?: number;
  disabledPagination?: boolean;
  params?: any[];
}): Promise<{
  result: any[];
  executionTime: number | string;
  totalRecord: number;
}> => {
  const originSQL = sql;

  if (disabledPagination == false) {
    const offset = (currentPage - 1) * pageSize;

    // Check if the query contains a limit clause
    const queryHasLimit = /LIMIT\s+\d+/i.test(sql);

    // If the query doesn't contain a limit clause, add pagination
    if (!queryHasLimit) {
      sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
    }
  }

  const client: PoolClient = await pool.connect();
  try {
    const start = process.hrtime(); // Start measuring time
    let total = 0;

    const result = await client.query(sql, params);

    if (disabledPagination == false) {
      const totalResult = await client.query(
        `SELECT COUNT(*) FROM (${originSQL}) as countQuery`,
        params
      );
      total = parseInt(totalResult.rows[0].count, 10);
    } else {
      total = result.rowCount || 0;
    }

    const end = process.hrtime(start); // Stop measuring time
    const executionTimeInMs = end[0] * 1000 + end[1] / 1000000; // Calculate execution time in milliseconds

    return {
      result: result.rows,
      executionTime: executionTimeInMs.toFixed(2),
      totalRecord: total,
    };
  } finally {
    client.release(); // Release the client back to the pool
  }
};
