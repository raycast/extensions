export function formatDefaultSender(preferences: { sender_name?: string; sender_email?: string }) {
  const email = preferences.sender_email?.trim();
  const name = preferences.sender_name?.trim();
  return email ? (name ? `${name} <${email}>` : email) : "";
}
