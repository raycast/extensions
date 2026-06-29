type AuthRequiredListener = () => void;

const authRequiredListeners = new Set<AuthRequiredListener>();

export function subscribeToAuthRequired(listener: AuthRequiredListener) {
  authRequiredListeners.add(listener);

  return () => {
    authRequiredListeners.delete(listener);
  };
}

export function notifyAuthRequired() {
  for (const listener of authRequiredListeners) {
    listener();
  }
}
