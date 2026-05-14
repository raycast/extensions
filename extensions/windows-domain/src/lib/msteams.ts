export function generateMsTeamsCallUrl({ emailAddress }: { emailAddress: string }): string {
  return `msteams://teams.microsoft.com/l/call/0/0?users=${encodeURI(emailAddress)}`;
}

export function generateMsTeamsChatUrl({ emailAddress }: { emailAddress: string }): string {
  return `msteams://teams.microsoft.com/l/chat/0/0?users=${encodeURI(emailAddress)}`;
}
