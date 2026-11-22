export interface Connection {
  id: string;
  name: string;
  host: string;
  user: string;
  port: string;
  identityFile: string;
  notes: string;
  favorite: boolean;
}

export type ConnectionFields = Omit<Connection, "id" | "favorite">;

function hasControl(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function validate(
  fields: ConnectionFields,
): Partial<Record<keyof ConnectionFields, string>> {
  const errors: Partial<Record<keyof ConnectionFields, string>> = {};
  if (!fields.name.trim()) errors.name = "Enter a name";
  const host = fields.host.trim();
  if (!host || host.startsWith("-") || /\s/.test(host) || hasControl(host))
    errors.host = "Enter a hostname, IP address, or SSH config alias";
  const user = fields.user.trim();
  if (user && (user.startsWith("-") || /[\s@]/.test(user) || hasControl(user)))
    errors.user = "Enter a valid SSH username";
  if (
    fields.port &&
    (!/^\d+$/.test(fields.port) ||
      Number(fields.port) < 1 ||
      Number(fields.port) > 65535)
  )
    errors.port = "Enter a port from 1 to 65535";
  if (hasControl(fields.identityFile))
    errors.identityFile = "The path cannot contain control characters";
  return errors;
}

export function sshArgs(connection: Connection): string[] {
  const args: string[] = [];
  if (connection.port) args.push("-p", connection.port);
  if (connection.identityFile)
    args.push(
      "-i",
      connection.identityFile.replace(/^~(?=\/|$)/, process.env.HOME || "~"),
    );
  if (connection.user) args.push("-l", connection.user);
  args.push(connection.host);
  return args;
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function sshCommand(connection: Connection): string {
  return ["/usr/bin/ssh", ...sshArgs(connection)].map(shellQuote).join(" ");
}
