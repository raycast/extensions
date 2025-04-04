export class EmptyTextError extends Error {
  constructor(message = "Text input is empty.") {
    super(message);
    this.name = "EmptyTextError";
  }
}
