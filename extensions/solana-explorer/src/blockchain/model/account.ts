export class Account {
  readonly address: string;
  readonly executable?: boolean;
  readonly lamports?: number;
  readonly owner?: string;

  constructor(address: string, executable?: boolean, lamports?: number, owner?: string) {
    this.address = address;
    this.executable = executable;
    this.lamports = lamports;
    this.owner = owner;
  }
}
