import { Content, Command } from "@types";

export class ContentStore {
  private content: Content;

  getContent = (): Content => this.content;

  constructor() {
    this.content = {};
  }

  setContent(content: Content): void {
    this.content = content;
  }

  contentFor(identifier: string): Command | null {
    return this.content[identifier];
  }

  add(command: Command): void {
    this.content[command.identifier] = command;
  }

  update(command: Command): void {
    this.content[command.identifier] = command;
  }

  delete(identifier: string): void {
    if (this.content && this.content[identifier]) {
      delete this.content[identifier];
    }
  }

  clear(): void {
    this.content = {};
  }
}
