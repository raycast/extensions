export interface Environment {
  Bindings: {
    CFCG_DB: D1Database;
  };
  Variables: {
    user: User;
    isAuthenticated: boolean;
  };
}
