declare global {
  namespace Preferences {
    interface Command {
      menuName: string;
      alsoRaycastRestore?: boolean;
    }
  }
}
export {};
