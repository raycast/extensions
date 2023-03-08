export interface SessionState {
  readonly token: string | undefined;
  readonly isLoading: boolean;
  readonly isLocked: boolean;
  readonly isAuthenticated: boolean;
  readonly lastActivityTime: Date | undefined;
}
