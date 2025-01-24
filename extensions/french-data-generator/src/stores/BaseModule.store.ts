export abstract class BaseModule {
  private static instances: { [key: string]: BaseModule } = {};

  protected constructor() {
    // This is intentional
  }

  public static getInstance<T extends BaseModule>(this: new () => T): T {
    const className = this.name;
    if (!BaseModule.instances[className]) {
      BaseModule.instances[className] = new this();
    }
    return BaseModule.instances[className] as T;
  }
}
