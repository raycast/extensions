export class Warning extends Error {
  constructor(message: string) {
    super(message)
    this.name = "Warning"
  }
}

export type ErrorText = { name: string; message: string }
export const ErrorText = (name: string, message: string) => ({ name, message })

export class PresentableError extends Error {
  constructor(name: string, message: string) {
    super(message)
    this.name = name
  }
}
