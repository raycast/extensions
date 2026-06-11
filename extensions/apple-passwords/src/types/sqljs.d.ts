declare module "sql.js/dist/sql-asm.js" {
  type SqlJsModule = {
    Database: new (data?: Uint8Array) => unknown;
  };

  export default function initSqlJs(): Promise<SqlJsModule>;
}
