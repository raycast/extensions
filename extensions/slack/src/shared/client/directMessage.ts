type OpenDirectMessage = (args: { users: string }) => Promise<{
  ok?: boolean;
  error?: string;
  channel?: { id?: string };
}>;

export async function resolveDirectMessageId(
  userId: string,
  conversationId: string | undefined,
  openConversation: OpenDirectMessage,
): Promise<string> {
  if (conversationId && /^D[A-Z0-9]{8,}$/.test(conversationId)) return conversationId;
  if (!/^[UW][A-Z0-9]{8,}$/.test(userId)) throw new Error("Invalid Slack user ID");
  const response = await openConversation({ users: userId });
  if (response.error || response.ok === false)
    throw new Error(response.error ?? "Slack could not open the direct message");
  const id = response.channel?.id;
  if (!id || !/^D[A-Z0-9]{8,}$/.test(id))
    throw new Error("Slack did not return a valid direct message conversation ID");
  return id;
}

export async function performDirectMessageAction(
  userId: string,
  conversationId: string | undefined,
  openConversation: OpenDirectMessage,
  action: (id: string) => Promise<void>,
  onError: (error: unknown) => Promise<unknown>,
): Promise<void> {
  try {
    await action(await resolveDirectMessageId(userId, conversationId, openConversation));
  } catch (error) {
    await onError(error);
  }
}
