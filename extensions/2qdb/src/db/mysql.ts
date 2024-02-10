/* eslint-disable @typescript-eslint/no-explicit-any */
import mysql, { PoolConfig, Pool } from "mysql";

export const createPool = (config: PoolConfig) => {
  return mysql.createPool(config);
};

export const query = ({
  pool,
  sql,
  // currentPage = 1,
  // disabledPagination = false,
  // pageSize = 10,
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
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }

      connection.query(sql, params, (error, results) => {
        connection.release(); // Release the connection back to the pool

        if (error) {
          reject(error);
          return;
        }

        resolve(results);
      });
    });
  });
};
