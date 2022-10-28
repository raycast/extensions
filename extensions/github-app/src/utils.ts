export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.startsWith("Error: ")) {
      const [_, m] = msg.split("Error: ");
      return m;
    }
    return msg;
  }
  return "Unknown Error";
}

export function capitalizeFirstLetter(name: string): string {
  return name.replace(/^./, name[0].toUpperCase());
}
