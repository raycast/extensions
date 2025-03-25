export interface SessionState {
  readonly token: string | undefined;
  readonly passwordHash: string | undefined;

  readonly isLoading: boolean;
  readonly isLocked: boolean;
  readonly isAuthenticated: boolean;
}
