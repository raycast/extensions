export default interface Preferences {
  project_id: string | undefined;
  service_account: string | undefined;
  service_account_secret: string | undefined;
}

export function arePreferencesValid(prefs: Preferences): boolean {
  return (
    prefs.project_id !== undefined && prefs.service_account !== undefined && prefs.service_account_secret !== undefined
  );
}
